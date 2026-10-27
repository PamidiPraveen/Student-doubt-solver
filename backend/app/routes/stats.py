from flask import Blueprint, jsonify

from app import db
from app.models import Answer, Question, User

stats_bp = Blueprint("stats", __name__)


@stats_bp.get("/")
def public_stats():
    """Headline numbers for the landing page. No personal data."""

    def count(model, *where):
        return db.session.execute(
            db.select(db.func.count(model.id)).where(*where)
        ).scalar_one()

    return jsonify({
        "success": True,
        "data": {
            "questions": count(Question),
            "answers": count(Answer),
            "faculty": count(User, User.role == "faculty",
                             User.is_active.is_(True)),
            "students": count(User, User.role == "student",
                              User.is_active.is_(True)),
        },
    }), 200
