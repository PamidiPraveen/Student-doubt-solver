
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required
from sqlalchemy.exc import IntegrityError

from app import db, limiter
from app.models import User
from app.routes.common import get_active_user
from app.services.security import (
    hash_password,
    normalize_email,
    verify_password,
)
from app.services.validators import validate_registration


auth_bp = Blueprint("auth", __name__)


def user_payload(user):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }


def _limit(config_key):
    return lambda: current_app.config[config_key]


@auth_bp.post("/register")
@limiter.limit(_limit("REGISTER_RATE_LIMIT"))
def register():
    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({
            "success": False,
            "error": {
                "code": "INVALID_JSON",
                "message": "A valid JSON object is required.",
            },
        }), 400

    result = validate_registration(
        name=payload.get("name"),
        email=payload.get("email"),
        password=payload.get("password"),
        role=payload.get("role", "student"),
    )

    if not result["valid"]:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Please correct the submitted fields.",
                "details": result["errors"],
            },
        }), 400

    data = result["data"]
    email = normalize_email(data["email"])

    user = User(
        name=data["name"],
        email=email,
        password_hash=hash_password(payload["password"]),
        role=data["role"],
    )

    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": {
                "code": "EMAIL_ALREADY_REGISTERED",
                "message": "An account with this email already exists.",
            },
        }), 409

    return jsonify({
        "success": True,
        "data": user_payload(user),
    }), 201

@auth_bp.post("/login")
@limiter.limit(_limit("LOGIN_RATE_LIMIT"))
def login():
    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({
            "success": False,
            "error": {
                "code": "INVALID_JSON",
                "message": "A valid JSON object is required.",
            },
        }), 400

    email = payload.get("email")
    password = payload.get("password")

    if (
        not isinstance(email, str)
        or not email.strip()
        or not isinstance(password, str)
        or not password
    ):
        return jsonify({
            "success": False,
            "error": {
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password.",
            },
        }), 400

    user = db.session.execute(
        db.select(User).where(
            User.email == normalize_email(email)
        )
    ).scalar_one_or_none()

    if (
        user is None
        or not verify_password(password, user.password_hash)
    ):
        return jsonify({
            "success": False,
            "error": {
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password.",
            },
        }), 401

    if not user.is_active:
        return jsonify({
            "success": False,
            "error": {
                "code": "ACCOUNT_INACTIVE",
                "message": "This account is inactive.",
            },
        }), 403

    access_token = create_access_token(
        identity=str(user.id)
    )

    return jsonify({
        "success": True,
        "data": {
            "access_token": access_token,
            "token_type": "Bearer",
            "user": user_payload(user),
        },
    }), 200

@auth_bp.get("/me")
@jwt_required()
def get_current_user():
    user = get_active_user()

    if user is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "USER_NOT_AVAILABLE",
                "message": "This account is unavailable.",
            },
        }), 401

    return jsonify({
        "success": True,
        "data": user_payload(user),
    }), 200
