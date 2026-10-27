
import pytest
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import User


def test_user_can_be_saved(app):
    with app.app_context():
        user = User(
            name="Test Student",
            email="student@example.test",
            password_hash="test-hash-not-a-real-password",
            role="student",
        )

        db.session.add(user)
        db.session.commit()

        saved_user = db.session.get(User, user.id)

        assert saved_user is not None
        assert saved_user.email == "student@example.test"
        assert saved_user.role == "student"


def test_user_email_must_be_unique(app):
    with app.app_context():
        first = User(
            name="Student One",
            email="duplicate@example.test",
            password_hash="test-hash",
        )
        second = User(
            name="Student Two",
            email="duplicate@example.test",
            password_hash="test-hash",
        )

        db.session.add(first)
        db.session.commit()

        db.session.add(second)

        with pytest.raises(IntegrityError):
            db.session.commit()

        db.session.rollback()
