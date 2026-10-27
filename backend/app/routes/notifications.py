from flask import Blueprint, jsonify, request

from app import db
from app.models import Notification
from app.routes.common import (
    error_response,
    iso,
    parse_pagination,
    user_required,
)

notifications_bp = Blueprint("notifications", __name__)


def notification_response(n):
    return {
        "id": n.id,
        "kind": n.kind,
        "title": n.title,
        "message": n.message,
        "link": n.link,
        "is_read": bool(n.is_read),
        "created_at": iso(n.created_at),
    }


def _unread_count(user_id):
    return db.session.execute(
        db.select(db.func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
    ).scalar_one()


@notifications_bp.get("/")
@user_required()
def list_notifications(user):
    limit, offset, bad = parse_pagination(request.args, default_limit=20)
    if bad:
        return bad

    query = db.select(Notification).where(Notification.user_id == user.id)
    if request.args.get("unread") in {"1", "true"}:
        query = query.where(Notification.is_read.is_(False))

    total = db.session.execute(
        db.select(db.func.count()).select_from(query.subquery())
    ).scalar_one()

    rows = db.session.execute(
        query.order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(limit)
        .offset(offset)
    ).scalars().all()

    return jsonify({
        "success": True,
        "data": [notification_response(n) for n in rows],
        "meta": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "unread": _unread_count(user.id),
        },
    }), 200


@notifications_bp.get("/unread-count")
@user_required()
def unread_count(user):
    return jsonify({
        "success": True,
        "data": {"unread": _unread_count(user.id)},
    }), 200


@notifications_bp.post("/<int:notification_id>/read")
@user_required()
def mark_read(user, notification_id):
    n = db.session.get(Notification, notification_id)
    if n is None or n.user_id != user.id:
        return error_response(
            "NOTIFICATION_NOT_FOUND",
            "That notification was not found.",
            404,
        )
    if not n.is_read:
        n.is_read = True
        db.session.commit()
    return jsonify({"success": True, "data": notification_response(n)}), 200


@notifications_bp.post("/read-all")
@user_required()
def mark_all_read(user):
    db.session.execute(
        db.update(Notification)
        .where(
            Notification.user_id == user.id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    db.session.commit()
    return jsonify({"success": True, "data": {"unread": 0}}), 200
