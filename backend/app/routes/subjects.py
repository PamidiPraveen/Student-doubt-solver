from flask import Blueprint, current_app, jsonify
from flask_jwt_extended import jwt_required

subjects_bp = Blueprint("subjects", __name__)


@subjects_bp.get("/")
@jwt_required()
def list_subjects():
    return jsonify({
        "success": True,
        "data": list(current_app.config["SUBJECTS"]),
    }), 200
