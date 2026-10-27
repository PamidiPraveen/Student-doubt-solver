from flask import Blueprint, jsonify, request

from app import db
from app.models import Answer, Question, User
from app.routes.common import (
    error_response,
    iso,
    parse_pagination,
    user_required,
)

library_bp = Blueprint("library", __name__)


def library_item(question, answer_count):
    # Deliberately no student id or name: published questions are anonymous.
    return {
        "id": question.id,
        "subject": question.subject,
        "title": question.title,
        "body": question.body,
        "published_at": iso(question.published_at),
        "answer_count": answer_count,
    }


@library_bp.get("/")
@user_required()
def list_library(user):
    query = db.select(Question).where(Question.is_published.is_(True))

    subject = request.args.get("subject")
    if subject:
        query = query.where(Question.subject == subject.strip())

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

    questions = db.session.execute(
        query.order_by(Question.published_at.desc(), Question.id.desc())
        .limit(limit)
        .offset(offset)
    ).scalars().all()

    counts = dict(
        db.session.execute(
            db.select(Answer.question_id, db.func.count(Answer.id))
            .where(Answer.question_id.in_([q.id for q in questions]))
            .group_by(Answer.question_id)
        ).all()
    ) if questions else {}

    return jsonify({
        "success": True,
        "data": [library_item(q, counts.get(q.id, 0)) for q in questions],
        "meta": {"total": total, "limit": limit, "offset": offset},
    }), 200


@library_bp.get("/<int:question_id>")
@user_required()
def get_library_item(user, question_id):
    question = db.session.get(Question, question_id)

    if question is None or not question.is_published:
        return error_response(
            "QUESTION_NOT_FOUND",
            "The requested question was not found.",
            404,
        )

    rows = db.session.execute(
        db.select(Answer, User.name, User.role)
        .join(User, User.id == Answer.faculty_id)
        .where(Answer.question_id == question.id)
        .order_by(Answer.created_at.asc(), Answer.id.asc())
    ).all()

    return jsonify({
        "success": True,
        "data": {
            **library_item(question, len(rows)),
            "answers": [
                {
                    "id": a.id,
                    "body": a.body,
                    # Faculty are named; student answers stay anonymous.
                    "author_role": role,
                    "author_name": name if role == "faculty" else None,
                    "faculty_name": name if role == "faculty" else None,
                    "created_at": iso(a.created_at),
                }
                for a, name, role in rows
            ],
        },
    }), 200
