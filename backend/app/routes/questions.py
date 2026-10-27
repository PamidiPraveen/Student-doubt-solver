
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from app import db
from app.ai.service import find_duplicate_question
from app.models import Answer, Question, User
from app.routes.common import (
    error_response,
    iso,
    parse_pagination,
    user_required,
)
from app.services.moderation import moderate
from app.services.notify import reject_content, reject_duplicate_question

questions_bp = Blueprint("questions", __name__)

STATUSES = {"open", "answered", "closed"}


def question_response(question, student_name=None, answer_count=None):
    data = {
        "id": question.id,
        "student_id": question.student_id,
        "student_name": student_name,
        "subject": question.subject,
        "title": question.title,
        "body": question.body,
        "status": question.status,
        "ai_answer": question.ai_answer,
        "is_published": bool(question.is_published),
        "published_at": iso(question.published_at),
        "created_at": iso(question.created_at),
        "updated_at": iso(question.updated_at),
    }
    if answer_count is not None:
        data["answer_count"] = answer_count
    return data


def _answer_counts(question_ids):
    if not question_ids:
        return {}
    rows = db.session.execute(
        db.select(Answer.question_id, db.func.count(Answer.id))
        .where(Answer.question_id.in_(question_ids))
        .group_by(Answer.question_id)
    ).all()
    return dict(rows)


def _name_of(user_id):
    return db.session.execute(
        db.select(User.name).where(User.id == user_id)
    ).scalar_one_or_none()


def _visible_question(user, question_id):
    """Return the question, or None. Every signed-in user can read every
    question, so that students and faculty can answer each other's doubts."""
    return db.session.get(Question, question_id)


@questions_bp.post("/")
@user_required()
def create_question(user):
    if user.role != "student":
        return error_response(
            "STUDENT_ONLY",
            "Only students can submit questions.",
            403,
        )

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response(
            "INVALID_JSON",
            "A valid JSON object is required.",
            400,
        )

    subject = payload.get("subject")
    title = payload.get("title")
    body = payload.get("body")

    errors = {}

    if not isinstance(subject, str) or not subject.strip():
        errors["subject"] = "Subject is required."
    elif len(subject.strip()) > 120:
        errors["subject"] = "Subject must be at most 120 characters."

    if not isinstance(title, str) or not title.strip():
        errors["title"] = "Title is required."
    elif len(title.strip()) > 200:
        errors["title"] = "Title must be at most 200 characters."

    if not isinstance(body, str) or not body.strip():
        errors["body"] = "Question body is required."
    elif len(body.strip()) > 10000:
        errors["body"] = "Question body must be at most 10000 characters."

    if errors:
        return error_response(
            "VALIDATION_ERROR",
            "Please correct the submitted fields.",
            400,
            details=errors,
        )

    verdict = moderate(subject, title, body)
    if not verdict.allowed:
        return reject_content(user, "question", verdict)

    duplicate = find_duplicate_question(
        title.strip(), body.strip(), subject.strip()
    )
    if duplicate is not None:
        return reject_duplicate_question(user, duplicate)

    question = Question(
        student_id=user.id,
        subject=subject.strip(),
        title=title.strip(),
        body=body.strip(),
        status="open",
    )

    try:
        db.session.add(question)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify({
        "success": True,
        "data": question_response(question, student_name=user.name,
                                  answer_count=0),
    }), 201


@questions_bp.get("/")
@user_required("student", "faculty")
def list_questions(user):
    query = db.select(Question)

    if request.args.get("mine") in {"1", "true"}:
        query = query.where(Question.student_id == user.id)

    subject = request.args.get("subject")
    if subject:
        query = query.where(Question.subject == subject.strip())

    status = request.args.get("status")
    if status:
        if status not in STATUSES:
            return error_response(
                "INVALID_STATUS",
                "Status must be open, answered, or closed.",
                400,
            )
        query = query.where(Question.status == status)

    search = (request.args.get("q") or "").strip()
    if search:
        if len(search) > 100:
            return error_response(
                "VALIDATION_ERROR",
                "Search text must be at most 100 characters.",
                400,
            )
        escaped = (
            search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        )
        pattern = f"%{escaped}%"
        query = query.where(
            db.or_(
                Question.title.ilike(pattern, escape="\\"),
                Question.body.ilike(pattern, escape="\\"),
            )
        )

    limit, offset, bad = parse_pagination(request.args)
    if bad:
        return bad

    total = db.session.execute(
        db.select(db.func.count()).select_from(query.subquery())
    ).scalar_one()

    rows = db.session.execute(
        query.add_columns(User.name)
        .join(User, User.id == Question.student_id)
        .order_by(Question.created_at.desc(), Question.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()

    counts = _answer_counts([q.id for q, _ in rows])

    return jsonify({
        "success": True,
        "data": [
            question_response(q, student_name=name,
                              answer_count=counts.get(q.id, 0))
            for q, name in rows
        ],
        "meta": {"total": total, "limit": limit, "offset": offset},
    }), 200


@questions_bp.get("/<int:question_id>")
@user_required("student", "faculty")
def get_question(user, question_id):
    question = _visible_question(user, question_id)

    if question is None:
        return error_response(
            "QUESTION_NOT_FOUND",
            "The requested question was not found.",
            404,
        )

    count = _answer_counts([question.id]).get(question.id, 0)

    return jsonify({
        "success": True,
        "data": question_response(
            question,
            student_name=_name_of(question.student_id),
            answer_count=count,
        ),
    }), 200


@questions_bp.delete("/<int:question_id>")
@user_required("student", "faculty")
def delete_question(user, question_id):
    question = db.session.get(Question, question_id)

    if question is None:
        return error_response(
            "QUESTION_NOT_FOUND",
            "The requested question was not found.",
            404,
        )

    if question.student_id != user.id:
        return error_response(
            "NOT_QUESTION_OWNER",
            "Only the person who asked can delete this question.",
            403,
        )

    try:
        db.session.execute(
            db.delete(Answer).where(Answer.question_id == question.id)
        )
        db.session.delete(question)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify({"success": True, "data": {"deleted": True}}), 200


@questions_bp.post("/<int:question_id>/close")
@user_required("student", "faculty")
def close_question(user, question_id):
    question = _visible_question(user, question_id)

    if question is None:
        return error_response(
            "QUESTION_NOT_FOUND",
            "The requested question was not found.",
            404,
        )

    if user.role == "student" and question.student_id != user.id:
        return error_response(
            "NOT_QUESTION_OWNER",
            "Only the person who asked can close this question.",
            403,
        )

    if question.status != "closed":
        question.status = "closed"
        db.session.commit()

    count = _answer_counts([question.id]).get(question.id, 0)
    return jsonify({
        "success": True,
        "data": question_response(
            question,
            student_name=_name_of(question.student_id),
            answer_count=count,
        ),
    }), 200


def _set_published(user, question_id, publish):
    question = db.session.get(Question, question_id)

    if question is None:
        return error_response(
            "QUESTION_NOT_FOUND",
            "The requested question was not found.",
            404,
        )

    count = _answer_counts([question.id]).get(question.id, 0)

    if publish and count == 0:
        return error_response(
            "QUESTION_HAS_NO_ANSWER",
            "Only questions with a faculty answer can be published.",
            409,
        )

    if bool(question.is_published) != publish:
        question.is_published = publish
        question.published_at = (
            datetime.now(timezone.utc).replace(tzinfo=None)
            if publish else None
        )
        db.session.commit()

    return jsonify({
        "success": True,
        "data": question_response(
            question,
            student_name=_name_of(question.student_id),
            answer_count=count,
        ),
    }), 200


@questions_bp.post("/<int:question_id>/publish")
@user_required("faculty")
def publish_question(user, question_id):
    return _set_published(user, question_id, True)


@questions_bp.post("/<int:question_id>/unpublish")
@user_required("faculty")
def unpublish_question(user, question_id):
    return _set_published(user, question_id, False)
