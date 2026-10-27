
from app import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="student")
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp(),
    )

class Question(db.Model):
    __tablename__ = "questions"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    subject = db.Column(db.String(120), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=False)

    status = db.Column(
        db.String(20),
        nullable=False,
        default="open",
        index=True,
    )

    # Legacy column, never written. AI output lives in its own tables and
    # is never stored as an answer.
    ai_answer = db.Column(db.Text, nullable=True)

    # Faculty can publish an answered question, anonymously, to the library.
    is_published = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
        server_default=db.false(),
        index=True,
    )
    published_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp(),
    )

    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp(),
        onupdate=db.func.current_timestamp(),
    )

class Answer(db.Model):
    """An answer from any signed-in user, student or faculty.

    ``faculty_id`` is the historical column name and now holds the author's
    user id whatever their role. The role is read from the users table.
    """

    __tablename__ = "answers"

    id = db.Column(db.Integer, primary_key=True)

    question_id = db.Column(
        db.Integer,
        db.ForeignKey("questions.id"),
        nullable=False,
        index=True,
    )

    faculty_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    body = db.Column(db.Text, nullable=False)

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp(),
    )



class AiFeedback(db.Model):
    """A user's verdict on an AI suggestion (helpful or not)."""

    __tablename__ = "ai_feedback"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    feature = db.Column(db.String(40), nullable=False)
    target_id = db.Column(db.Integer, nullable=True)
    helpful = db.Column(db.Boolean, nullable=False)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp(),
    )


class Notification(db.Model):
    """A message shown in a user's notification bell."""

    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    # content_blocked | new_answer
    kind = db.Column(db.String(40), nullable=False)
    title = db.Column(db.String(160), nullable=False)
    message = db.Column(db.String(500), nullable=False)
    link = db.Column(db.String(200), nullable=True)
    is_read = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
        server_default=db.false(),
        index=True,
    )
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp(),
    )


class ModerationEvent(db.Model):
    """Audit record of a blocked post. The blocked text is never stored."""

    __tablename__ = "moderation_events"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    target = db.Column(db.String(20), nullable=False)  # question | answer
    categories = db.Column(db.String(120), nullable=False)
    source = db.Column(db.String(20), nullable=False)  # local | gemini
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp(),
    )
