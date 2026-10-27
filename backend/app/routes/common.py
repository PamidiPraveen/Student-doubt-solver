"""Helpers shared by the route modules."""

from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import db
from app.models import User


def error_response(code, message, status_code, details=None):
    error = {"code": code, "message": message}
    if details:
        error["details"] = details
    return jsonify({"success": False, "error": error}), status_code


def get_active_user():
    """Return the signed-in, active user, or None."""
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None

    user = db.session.get(User, user_id)
    if user is None or not user.is_active:
        return None

    return user


def parse_pagination(args, default_limit=20, max_limit=100):
    """Return (limit, offset, error_response_or_None)."""
    try:
        limit = int(args.get("limit", default_limit))
        offset = int(args.get("offset", 0))
    except (TypeError, ValueError):
        limit = offset = -1

    if limit < 1 or limit > max_limit or offset < 0:
        return None, None, error_response(
            "INVALID_PAGINATION",
            f"limit must be 1-{max_limit} and offset must be 0 or more.",
            400,
        )

    return limit, offset, None


def user_required(*roles):
    """Require a signed-in, active user (optionally with one of ``roles``).

    The decorated view receives the user as its first argument. Checks run
    in a fixed order: token, active account, role.
    """

    def decorator(view):
        @wraps(view)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user = get_active_user()
            if user is None:
                return error_response(
                    "USER_NOT_AVAILABLE",
                    "This account is unavailable.",
                    401,
                )

            if roles and user.role not in roles:
                return error_response(
                    "ROLE_NOT_ALLOWED",
                    "Your role cannot do this.",
                    403,
                )

            return view(user, *args, **kwargs)

        return wrapper

    return decorator


def iso(value):
    """ISO 8601 UTC with a Z suffix (the database stores naive UTC)."""
    return value.isoformat() + "Z" if value else None
