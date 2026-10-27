"""Abusive questions and answers are refused, never stored, and reported."""

import pytest

from app import db
from app.models import Answer, ModerationEvent, Notification, Question
from app.services.moderation import check_local
from tests.helpers import headers_for, make_question, make_user


def _users(app):
    student = make_user(app, "stu@example.com", "student", "Stu Dent")
    other = make_user(app, "other@example.com", "student", "Other One")
    faculty = make_user(app, "fac@example.com", "faculty", "Prof Fac")
    return student, other, faculty


def _notifications(app, user_id):
    with app.app_context():
        rows = db.session.execute(
            db.select(Notification).where(Notification.user_id == user_id)
            .order_by(Notification.id)
        ).scalars().all()
        return [(n.kind, n.title, n.message, n.link, n.is_read) for n in rows]


@pytest.mark.parametrize("text", [
    "You are an idiot",
    "what the f u c k",
    "this is bullsh1t",
    "What the heck?",
    "fuuuuuck this",
    "you stupid teacher",
    "I will kill you",
    "maderchod",
    "a$$hole",
    "you are stupid",
    "I feel so stupid asking this",
    "what a dumb question",
    "shut up and answer",
    "this teacher is useless",
])
def test_filter_blocks_abuse_and_disguises(text):
    assert check_local(text).allowed is False


@pytest.mark.parametrize("text", [
    "Explain the class assignment",
    "How does sex determination work?",
    "What is the Scunthorpe problem?",
    "Why is my compiler crap at optimising this loop?",
    "Difference between mc and bc in electronics",
    "Document the cocktail party effect",
    "Rape of the Lock: summarise the poem",
    "Why does garbage collection pause my program?",
    "How do I connect a dumb terminal to a Unix host?",
    "My program crashes and the result is wrong, why?",
])
def test_filter_allows_ordinary_academic_text(text):
    assert check_local(text).allowed is True


def test_abusive_question_is_rejected_not_stored_and_author_notified(app, client):
    student, _, _ = _users(app)

    response = client.post(
        "/api/v1/questions/",
        headers=headers_for(app, student),
        json={"subject": "Physics", "title": "Why is this fucking hard",
              "body": "Explain Newton's laws."},
    )

    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "CONTENT_REJECTED"
    with app.app_context():
        assert db.session.execute(
            db.select(db.func.count(Question.id))
        ).scalar_one() == 0
        event = db.session.execute(db.select(ModerationEvent)).scalar_one()
        assert event.target == "question" and event.user_id == student
        assert not hasattr(event, "body")

    notes = _notifications(app, student)
    assert len(notes) == 1
    kind, title, message, _, is_read = notes[0]
    assert kind == "content_blocked" and not is_read
    assert "was not posted" in title
    assert "fucking" not in message  # the abuse is never echoed back


def test_duplicate_question_is_not_stored_and_notification_links_to_existing(
    app, client
):
    student, other, _ = _users(app)
    existing_id = make_question(
        app,
        student,
        title="Why is the sky blue?",
        body="Explain Rayleigh scattering please.",
    )

    response = client.post(
        "/api/v1/questions/",
        headers=headers_for(app, other),
        json={
            "subject": "Physics",
            "title": "Why is the sky blue?",
            "body": "Explain Rayleigh scattering please.",
        },
    )

    assert response.status_code == 409
    result = response.get_json()["error"]
    assert result["code"] == "QUESTION_DUPLICATE"
    assert result["details"]["question_id"] == str(existing_id)
    assert result["details"]["link"] == f"/questions/{existing_id}"
    with app.app_context():
        assert db.session.execute(
            db.select(db.func.count(Question.id))
        ).scalar_one() == 1

    notes = _notifications(app, other)
    assert len(notes) == 1
    assert notes[0][0] == "question_duplicate"
    assert notes[0][3] == f"/questions/{existing_id}"
    assert "Why is the sky blue?" in notes[0][2]
    assert _notifications(app, student) == []


def test_abusive_answer_from_a_student_is_rejected(app, client):
    student, other, _ = _users(app)
    qid = make_question(app, student)

    response = client.post(
        f"/api/v1/questions/{qid}/answers",
        headers=headers_for(app, other),
        json={"body": "You idiot, it is obvious."},
    )

    assert response.status_code == 422
    with app.app_context():
        assert db.session.execute(
            db.select(db.func.count(Answer.id))
        ).scalar_one() == 0
        assert db.session.get(Question, qid).status == "open"
    assert _notifications(app, other)[0][0] == "content_blocked"
    assert _notifications(app, student) == []


def test_abusive_answer_from_faculty_is_rejected_too(app, client):
    student, _, faculty = _users(app)
    qid = make_question(app, student)

    response = client.post(
        f"/api/v1/questions/{qid}/answers",
        headers=headers_for(app, faculty),
        json={"body": "Learn to read, you stupid kid."},
    )

    assert response.status_code == 422
    assert _notifications(app, faculty)[0][0] == "content_blocked"


def test_clean_answers_from_student_and_faculty_notify_the_asker(app, client):
    student, other, faculty = _users(app)
    qid = make_question(app, student)

    by_student = client.post(
        f"/api/v1/questions/{qid}/answers",
        headers=headers_for(app, other),
        json={"body": "Rayleigh scattering favours short wavelengths."},
    )
    by_faculty = client.post(
        f"/api/v1/questions/{qid}/answers",
        headers=headers_for(app, faculty),
        json={"body": "Scattering goes as one over wavelength to the fourth."},
    )

    assert by_student.status_code == by_faculty.status_code == 201
    assert by_student.get_json()["data"]["author_role"] == "student"
    assert by_faculty.get_json()["data"]["author_role"] == "faculty"

    listing = client.get(
        f"/api/v1/questions/{qid}/answers", headers=headers_for(app, student)
    ).get_json()["data"]
    assert [a["author_role"] for a in listing] == ["student", "faculty"]

    notes = _notifications(app, student)
    assert [n[0] for n in notes] == ["new_answer", "new_answer"]
    assert notes[0][3] == f"/questions/{qid}"


def test_repeated_abuse_adds_a_warning(app, client):
    student, _, _ = _users(app)
    for _ in range(3):
        client.post(
            "/api/v1/questions/",
            headers=headers_for(app, student),
            json={"subject": "Physics", "title": "fuck", "body": "x"},
        )
    last = _notifications(app, student)[-1]
    assert "warning 3" in last[2]


def test_notification_endpoints(app, client):
    student, other, _ = _users(app)
    client.post(
        "/api/v1/questions/",
        headers=headers_for(app, student),
        json={"subject": "Physics", "title": "shit", "body": "x"},
    )
    h = headers_for(app, student)

    count = client.get("/api/v1/notifications/unread-count", headers=h)
    assert count.get_json()["data"]["unread"] == 1

    listing = client.get("/api/v1/notifications/", headers=h).get_json()
    assert listing["meta"]["unread"] == 1
    nid = listing["data"][0]["id"]

    # Someone else cannot touch it.
    forbidden = client.post(
        f"/api/v1/notifications/{nid}/read", headers=headers_for(app, other)
    )
    assert forbidden.status_code == 404

    assert client.post(f"/api/v1/notifications/{nid}/read", headers=h).status_code == 200
    assert client.get("/api/v1/notifications/unread-count", headers=h).get_json()["data"]["unread"] == 0

    client.post(
        "/api/v1/questions/", headers=h,
        json={"subject": "Physics", "title": "shit again", "body": "x"},
    )
    assert client.post("/api/v1/notifications/read-all", headers=h).status_code == 200
    assert client.get("/api/v1/notifications/unread-count", headers=h).get_json()["data"]["unread"] == 0


def test_notifications_require_sign_in(client):
    assert client.get("/api/v1/notifications/").status_code == 401


def test_public_stats_has_no_personal_data(app, client):
    student, _, faculty = _users(app)
    make_question(app, student)
    data = client.get("/api/v1/stats/").get_json()["data"]
    assert data == {"questions": 1, "answers": 0, "faculty": 1, "students": 2}


def test_library_hides_student_answer_authors(app, client):
    from tests.helpers import make_answer
    student, other, faculty = _users(app)
    qid = make_question(app, student, published=True)
    make_answer(app, qid, other, "student reply")
    make_answer(app, qid, faculty, "faculty reply")

    answers = client.get(
        f"/api/v1/library/{qid}", headers=headers_for(app, student)
    ).get_json()["data"]["answers"]
    by_role = {a["author_role"]: a["author_name"] for a in answers}
    assert by_role == {"student": None, "faculty": "Prof Fac"}
