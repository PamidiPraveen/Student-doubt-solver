from flask import Blueprint, jsonify, request

from app import db
from app.models import Answer, Question, User
from app.routes.common import error_response, iso, user_required
from app.services.moderation import moderate
from app.services.notify import notify, reject_content

answers_bp = Blueprint("answers", __name__)


def answer_response(answer, author_name=None, author_role=None):
    return {
        "id": answer.id,
        "question_id": answer.question_id,
        "author_id": answer.faculty_id,
        "author_name": author_name,
        "author_role": author_role,
        "body": answer.body,
        "created_at": iso(answer.created_at),
        # Older clients read these two names.
        "faculty_id": answer.faculty_id,
        "faculty_name": author_name,
    }


@answers_bp.post("/<int:question_id>/answers")
@user_required("student", "faculty")
def create_answer(user, question_id):
    """Students and faculty can both answer any open doubt."""
    question = db.session.get(Question, question_id)

    if question is None:
        return error_response(
            "QUESTION_NOT_FOUND",
            "The requested question was not found.",
            404,
        )

    if question.status == "closed":
        return error_response(
            "QUESTION_CLOSED",
            "This question is closed and cannot receive answers.",
            409,
        )

    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return error_response(
            "INVALID_JSON",
            "A valid JSON object is required.",
            400,
        )

    body = payload.get("body")

    if not isinstance(body, str) or not body.strip():
        return error_response(
            "VALIDATION_ERROR",
            "Answer body is required.",
            400,
        )

    if len(body.strip()) > 10000:
        return error_response(
            "VALIDATION_ERROR",
            "Answer body must be at most 10000 characters.",
            400,
        )

    verdict = moderate(body, kind="answer", context=question.title)
    if not verdict.allowed:
        return reject_content(user, "answer", verdict, context=question.title)

    answer = Answer(
        question_id=question.id,
        faculty_id=user.id,
        body=body.strip(),
    )

    try:
        db.session.add(answer)
        # The asker replying to their own doubt is a follow-up, not a
        # solution, so it does not mark the question as answered.
        if user.id != question.student_id:
            question.status = "answered"
            who = "A faculty member" if user.role == "faculty" else (
                f"{user.name}"
            )
            notify(
                question.student_id,
                "new_answer",
                "Your doubt has a new answer",
                f"{who} answered “{question.title[:80]}”.",
                link=f"/questions/{question.id}",
            )
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify({
        "success": True,
        "data": answer_response(answer, user.name, user.role),
    }), 201


@answers_bp.get("/<int:question_id>/answers")
@user_required("student", "faculty")
def list_answers(user, question_id):
    question = db.session.get(Question, question_id)

    if question is None:
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
        "data": [answer_response(a, n, r) for a, n, r in rows],
    }), 200


@answers_bp.delete("/<int:question_id>/answers/<int:answer_id>")
@user_required("student", "faculty")
def delete_answer(user, question_id, answer_id):
    question = db.session.get(Question, question_id)

    if question is None:
        return error_response(
            "QUESTION_NOT_FOUND",
            "The requested question was not found.",
            404,
        )

    answer = db.session.get(Answer, answer_id)
    if answer is None or answer.question_id != question.id:
        return error_response(
            "ANSWER_NOT_FOUND",
            "The requested answer was not found.",
            404,
        )

    if answer.faculty_id != user.id:
        return error_response(
            "NOT_ANSWER_AUTHOR",
            "Only the person who wrote this answer can delete it.",
            403,
        )

    try:
        db.session.delete(answer)
        db.session.flush()
        if question.status == "answered":
            has_solution = db.session.execute(
                db.select(Answer.id)
                .where(
                    Answer.question_id == question.id,
                    Answer.faculty_id != question.student_id,
                )
                .limit(1)
            ).first()
            if has_solution is None:
                question.status = "open"
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify({"success": True, "data": {"deleted": True}}), 200
