from flask import Blueprint, current_app, jsonify, request

from app import db, limiter
from app.ai import ai_meta
from app.ai.service import similar_library_questions, suggest_subjects
from app.models import AiFeedback
from app.routes.common import error_response, user_required

ai_bp = Blueprint("ai", __name__)

FEATURES = {"similar_questions", "subject_suggestion"}


def _ai_limit():
    return current_app.config["AI_RATE_LIMIT"]


def _draft_from_request():
    """Return ``(title, body, error_response)`` from the JSON payload."""
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return None, None, error_response(
            "INVALID_JSON", "A valid JSON object is required.", 400
        )

    title = payload.get("title")
    body = payload.get("body", "")

    errors = {}
    if not isinstance(title, str) or not title.strip():
        errors["title"] = "Title is required."
    elif len(title.strip()) > 200:
        errors["title"] = "Title must be at most 200 characters."
    if not isinstance(body, str):
        errors["body"] = "Body must be text."
    elif len(body) > 10000:
        errors["body"] = "Body must be at most 10000 characters."

    if errors:
        return None, None, error_response(
            "VALIDATION_ERROR",
            "Please correct the submitted fields.",
            400,
            details=errors,
        )

    return title.strip(), body.strip(), None


def _disabled_response():
    return jsonify({
        "success": True,
        "data": {"suggestions": []},
        "ai": ai_meta("local-tfidf", None, enabled=False),
    }), 200


@ai_bp.post("/similar")
@limiter.limit(_ai_limit)
@user_required("student", "faculty")
def similar(user):
    title, body, bad = _draft_from_request()
    if bad:
        return bad

    if not current_app.config["AI_ENABLED"]:
        return _disabled_response()

    suggestions, engine = similar_library_questions(title, body)
    return jsonify({
        "success": True,
        "data": {"suggestions": suggestions},
        "ai": ai_meta(engine, "similar_questions"),
    }), 200


@ai_bp.post("/suggest-subject")
@limiter.limit(_ai_limit)
@user_required("student", "faculty")
def suggest_subject(user):
    title, body, bad = _draft_from_request()
    if bad:
        return bad

    if not current_app.config["AI_ENABLED"]:
        return _disabled_response()

    suggestions, engine = suggest_subjects(title, body)
    return jsonify({
        "success": True,
        "data": {"suggestions": suggestions},
        "ai": ai_meta(engine, "subject_suggestion"),
    }), 200


@ai_bp.post("/feedback")
@limiter.limit(_ai_limit)
@user_required("student", "faculty")
def feedback(user):
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response(
            "INVALID_JSON", "A valid JSON object is required.", 400
        )

    feature = payload.get("feature")
    helpful = payload.get("helpful")
    target_id = payload.get("target_id")

    if feature not in FEATURES:
        return error_response(
            "VALIDATION_ERROR", "Unknown AI feature.", 400
        )
    if not isinstance(helpful, bool):
        return error_response(
            "VALIDATION_ERROR", "helpful must be true or false.", 400
        )
    if target_id is not None and (
        not isinstance(target_id, int) or isinstance(target_id, bool)
    ):
        return error_response(
            "VALIDATION_ERROR", "target_id must be a number.", 400
        )

    db.session.add(AiFeedback(
        user_id=user.id,
        feature=feature,
        target_id=target_id,
        helpful=helpful,
    ))
    db.session.commit()

    return jsonify({"success": True, "data": {"recorded": True}}), 201
