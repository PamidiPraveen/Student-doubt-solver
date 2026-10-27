"""Creating notifications and handling blocked content."""

from datetime import datetime, timedelta, timezone

from app import db
from app.models import ModerationEvent, Notification
from app.routes.common import error_response

STRIKE_WINDOW = timedelta(hours=24)


def notify(user_id, kind, title, message, link=None):
    """Queue a notification. The caller commits."""
    db.session.add(Notification(
        user_id=user_id,
        kind=kind,
        title=title[:160],
        message=message[:500],
        link=link,
    ))


def _recent_strikes(user_id):
    since = datetime.now(timezone.utc).replace(tzinfo=None) - STRIKE_WINDOW
    return db.session.execute(
        db.select(db.func.count(ModerationEvent.id)).where(
            ModerationEvent.user_id == user_id,
            ModerationEvent.created_at >= since,
        )
    ).scalar_one()


def reject_content(user, target, result, context=None):
    """Record a blocked post, tell the author, and build the API error.

    ``target`` is ``"question"`` or ``"answer"``. Nothing the person wrote is
    saved: only the category, the source and a notification.

    If the check itself could not run, nothing is wrong with the post, so no
    strike or notification is recorded: the person is just asked to retry.
    """
    if result.unavailable:
        return error_response(
            "MODERATION_UNAVAILABLE", result.message, 503
        )

    db.session.add(ModerationEvent(
        user_id=user.id,
        target=target,
        categories=",".join(result.categories),
        source=result.source,
    ))
    db.session.flush()
    strikes = _recent_strikes(user.id)

    what = "question" if target == "question" else "answer"
    message = (
        f"Your {what}{f' on “{context[:60]}”' if context else ''} was not "
        f"posted because it contained {result.reason}. "
        "Please keep the discussion respectful."
    )
    if strikes >= 3:
        message += (
            f" This is warning {strikes} in 24 hours; repeated abuse may "
            "lead to your account being reviewed."
        )

    notify(
        user.id,
        "content_blocked",
        f"Your {what} was not posted",
        message,
    )
    db.session.commit()

    return error_response(
        "CONTENT_REJECTED",
        result.message,
        422,
        details={"body": result.message},
    )


def reject_duplicate_question(user, question):
    """Notify the author and return an error pointing to the existing doubt."""
    link = f"/questions/{question.id}"
    notify(
        user.id,
        "question_duplicate",
        "A similar question already exists",
        f"Your question was not posted because “{question.title[:100]}” "
        "already covers this doubt. Open the existing question to read or "
        "add to its discussion.",
        link=link,
    )
    db.session.commit()
    return error_response(
        "QUESTION_DUPLICATE",
        "A similar question already exists. Open the existing question "
        "instead of posting it again.",
        409,
        details={
            "question_id": str(question.id),
            "question_title": question.title,
            "link": link,
        },
    )
