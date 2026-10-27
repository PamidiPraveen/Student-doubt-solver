from app import db
from app.models import Answer, Question
from tests.helpers import (
    headers_for, make_answer, make_question, make_user,
)


def _setup(app):
    student = make_user(app, "stu@example.com", name="Stu Dent")
    other = make_user(app, "other@example.com", name="Other Student")
    faculty = make_user(app, "fac@example.com", role="faculty", name="Prof Fac")
    return student, other, faculty


def test_list_is_paginated_with_meta_and_names(app, client):
    student, _, faculty = _setup(app)
    for i in range(5):
        make_question(app, student, title=f"Question {i}")

    response = client.get(
        "/api/v1/questions/?limit=2&offset=2", headers=headers_for(app, faculty)
    )

    body = response.get_json()
    assert response.status_code == 200
    assert body["meta"] == {"total": 5, "limit": 2, "offset": 2}
    assert [q["title"] for q in body["data"]] == ["Question 2", "Question 1"]
    assert body["data"][0]["student_name"] == "Stu Dent"
    assert body["data"][0]["answer_count"] == 0
    assert body["data"][0]["created_at"].endswith("Z")


def test_invalid_pagination_is_rejected(app, client):
    student, _, _ = _setup(app)

    for query in ("limit=0", "limit=101", "offset=-1", "limit=abc"):
        response = client.get(
            f"/api/v1/questions/?{query}", headers=headers_for(app, student)
        )
        assert response.status_code == 400
        assert response.get_json()["error"]["code"] == "INVALID_PAGINATION"


def test_search_and_filters(app, client):
    student, _, faculty = _setup(app)
    make_question(app, student, title="Integration by parts", subject="Mathematics")
    make_question(app, student, title="Newton laws", subject="Physics",
                  status="answered")
    headers = headers_for(app, faculty)

    by_text = client.get("/api/v1/questions/?q=integration", headers=headers)
    by_subject = client.get("/api/v1/questions/?subject=Physics", headers=headers)
    by_status = client.get("/api/v1/questions/?status=answered", headers=headers)
    wildcard = client.get("/api/v1/questions/?q=%25", headers=headers)

    assert [q["title"] for q in by_text.get_json()["data"]] == ["Integration by parts"]
    assert [q["title"] for q in by_subject.get_json()["data"]] == ["Newton laws"]
    assert by_status.get_json()["meta"]["total"] == 1
    assert wildcard.get_json()["data"] == []  # % is literal, not a wildcard


def test_answers_include_faculty_name(app, client):
    student, _, faculty = _setup(app)
    qid = make_question(app, student)

    created = client.post(
        f"/api/v1/questions/{qid}/answers",
        headers=headers_for(app, faculty),
        json={"body": "Scattering."},
    )
    listing = client.get(
        f"/api/v1/questions/{qid}/answers", headers=headers_for(app, student)
    )

    assert created.get_json()["data"]["faculty_name"] == "Prof Fac"
    assert listing.get_json()["data"][0]["faculty_name"] == "Prof Fac"


def test_student_can_close_own_question_and_answers_are_then_refused(app, client):
    student, other, faculty = _setup(app)
    qid = make_question(app, student)

    stranger = client.post(
        f"/api/v1/questions/{qid}/close", headers=headers_for(app, other)
    )
    closed = client.post(
        f"/api/v1/questions/{qid}/close", headers=headers_for(app, student)
    )
    again = client.post(
        f"/api/v1/questions/{qid}/close", headers=headers_for(app, student)
    )
    answer = client.post(
        f"/api/v1/questions/{qid}/answers",
        headers=headers_for(app, faculty),
        json={"body": "late"},
    )

    assert stranger.status_code == 403
    assert stranger.get_json()["error"]["code"] == "NOT_QUESTION_OWNER"
    assert closed.status_code == 200 and closed.get_json()["data"]["status"] == "closed"
    assert again.status_code == 200
    assert answer.status_code == 409
    assert answer.get_json()["error"]["code"] == "QUESTION_CLOSED"


def test_question_author_can_delete_question_and_all_its_answers(app, client):
    student, other, faculty = _setup(app)
    qid = make_question(app, student, published=True)
    make_answer(app, qid, faculty)

    forbidden = client.delete(
        f"/api/v1/questions/{qid}", headers=headers_for(app, other)
    )
    deleted = client.delete(
        f"/api/v1/questions/{qid}", headers=headers_for(app, student)
    )

    assert forbidden.status_code == 403
    assert forbidden.get_json()["error"]["code"] == "NOT_QUESTION_OWNER"
    assert deleted.status_code == 200
    assert deleted.get_json()["data"] == {"deleted": True}
    with app.app_context():
        assert db.session.get(Question, qid) is None
        assert db.session.execute(
            db.select(db.func.count(Answer.id))
        ).scalar_one() == 0


def test_answer_author_can_delete_answer_and_question_reopens(app, client):
    student, other, faculty = _setup(app)
    qid = make_question(app, student, status="answered")
    answer_id = make_answer(app, qid, faculty)

    forbidden = client.delete(
        f"/api/v1/questions/{qid}/answers/{answer_id}",
        headers=headers_for(app, other),
    )
    deleted = client.delete(
        f"/api/v1/questions/{qid}/answers/{answer_id}",
        headers=headers_for(app, faculty),
    )

    assert forbidden.status_code == 403
    assert forbidden.get_json()["error"]["code"] == "NOT_ANSWER_AUTHOR"
    assert deleted.status_code == 200
    assert deleted.get_json()["data"] == {"deleted": True}
    with app.app_context():
        assert db.session.get(Answer, answer_id) is None
        assert db.session.get(Question, qid).status == "open"


def test_deleting_one_answer_keeps_question_answered_if_another_remains(app, client):
    student, other, faculty = _setup(app)
    qid = make_question(app, student, status="answered")
    first_answer_id = make_answer(app, qid, faculty, "First response.")
    make_answer(app, qid, other, "Another response.")

    response = client.delete(
        f"/api/v1/questions/{qid}/answers/{first_answer_id}",
        headers=headers_for(app, faculty),
    )

    assert response.status_code == 200
    with app.app_context():
        assert db.session.get(Question, qid).status == "answered"


def test_publish_requires_faculty_and_an_answer(app, client):
    student, _, faculty = _setup(app)
    qid = make_question(app, student)

    by_student = client.post(
        f"/api/v1/questions/{qid}/publish", headers=headers_for(app, student)
    )
    unanswered = client.post(
        f"/api/v1/questions/{qid}/publish", headers=headers_for(app, faculty)
    )
    make_answer(app, qid, faculty)
    published = client.post(
        f"/api/v1/questions/{qid}/publish", headers=headers_for(app, faculty)
    )
    withdrawn = client.post(
        f"/api/v1/questions/{qid}/unpublish", headers=headers_for(app, faculty)
    )

    assert by_student.status_code == 403
    assert unanswered.status_code == 409
    assert unanswered.get_json()["error"]["code"] == "QUESTION_HAS_NO_ANSWER"
    assert published.get_json()["data"]["is_published"] is True
    assert published.get_json()["data"]["published_at"].endswith("Z")
    assert withdrawn.get_json()["data"]["is_published"] is False


def _published(app, student, faculty, **kw):
    qid = make_question(app, student, published=True, **kw)
    make_answer(app, qid, faculty)
    with app.app_context():
        from datetime import datetime
        db.session.get(Question, qid).published_at = datetime(2026, 1, 1)
        db.session.commit()
    return qid


def test_library_is_anonymous_and_shared(app, client):
    student, other, faculty = _setup(app)
    qid = _published(app, student, faculty, title="Rayleigh scattering")
    make_question(app, student, title="Private doubt")

    listing = client.get("/api/v1/library/", headers=headers_for(app, other))
    detail = client.get(f"/api/v1/library/{qid}", headers=headers_for(app, other))

    items = listing.get_json()["data"]
    assert [i["title"] for i in items] == ["Rayleigh scattering"]
    assert items[0]["answer_count"] == 1
    for payload in (items[0], detail.get_json()["data"]):
        assert "student_id" not in payload and "student_name" not in payload
    assert detail.get_json()["data"]["answers"][0]["faculty_name"] == "Prof Fac"


def test_library_hides_unpublished_and_requires_sign_in(app, client):
    student, other, _ = _setup(app)
    private = make_question(app, student)

    hidden = client.get(f"/api/v1/library/{private}", headers=headers_for(app, other))
    blocked = client.get("/api/v1/library/")

    assert hidden.status_code == 404
    assert blocked.status_code == 401


def test_library_search(app, client):
    student, other, faculty = _setup(app)
    _published(app, student, faculty, title="Eigenvalues", subject="Mathematics")
    _published(app, student, faculty, title="Optics", subject="Physics")

    response = client.get(
        "/api/v1/library/?subject=Physics", headers=headers_for(app, other)
    )

    assert [i["title"] for i in response.get_json()["data"]] == ["Optics"]


def test_subjects_endpoint(app, client):
    user = make_user(app, "p@example.com")

    response = client.get("/api/v1/subjects/", headers=headers_for(app, user))

    assert response.status_code == 200
    assert "Mathematics" in response.get_json()["data"]
    assert client.get("/api/v1/subjects/").status_code == 401
