"""Shared helpers for tests that need users in a given state."""

from flask_jwt_extended import create_access_token

from app import db
from app.models import Answer, Question, User

PASSWORD = "Strong-Password-123!"


def make_user(app, email, role="student", name=None, active=True):
    with app.app_context():
        user = User(
            name=name or email.split("@")[0].title(),
            email=email,
            password_hash="x",
            role=role,
            is_active=active,
        )
        db.session.add(user)
        db.session.commit()
        return user.id


def token_for(app, user_id):
    with app.app_context():
        return create_access_token(identity=str(user_id))


def headers_for(app, user_id):
    return {"Authorization": f"Bearer {token_for(app, user_id)}"}


def make_question(app, student_id, title="Why is the sky blue?",
                  body="Explain Rayleigh scattering please.",
                  subject="Physics", status="open", published=False):
    with app.app_context():
        question = Question(
            student_id=student_id,
            subject=subject,
            title=title,
            body=body,
            status=status,
            is_published=published,
        )
        db.session.add(question)
        db.session.commit()
        return question.id


def make_answer(app, question_id, faculty_id, body="Because of scattering."):
    with app.app_context():
        answer = Answer(
            question_id=question_id, faculty_id=faculty_id, body=body
        )
        db.session.add(answer)
        db.session.commit()
        return answer.id
