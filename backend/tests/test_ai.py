from app import db
from app.ai import service as ai_service
from app.ai.engine import TfidfIndex, document_text, tokenize
from app.models import AiFeedback, Answer, Question
from tests.helpers import (
    headers_for, make_answer, make_question, make_user,
)


# ---- engine ---------------------------------------------------------------

def test_tokenize_drops_stopwords_and_light_stems():
    assert tokenize("The integrals are being computed") == ["integral", "comput"]
    assert tokenize("integrate integrating integration") == ["integrat"] * 3
    assert tokenize("") == [] and tokenize(None) == []


def test_index_ranks_related_text_first():
    index = TfidfIndex([
        (1, document_text("Integration by parts", "How to integrate x e^x")),
        (2, document_text("Newton third law", "Action and reaction forces")),
        (3, document_text("Binary search trees", "Insertion and deletion")),
    ])

    hits = index.query("how do I integrate by parts?", limit=3)

    assert hits[0][0] == 1
    assert all(score <= 1.0001 for _, score in hits)


def test_index_handles_empty_and_unrelated_queries():
    assert TfidfIndex([]).query("anything") == []
    index = TfidfIndex([(1, "photosynthesis in plants")])
    assert index.query("quantum chromodynamics", min_score=0.1) == []
    assert index.query("the and of") == []


# ---- endpoints ------------------------------------------------------------

def _library(app):
    student = make_user(app, "stu@example.com")
    faculty = make_user(app, "fac@example.com", role="faculty", name="Prof Fac")
    ids = {}
    for key, (title, body, subject) in {
        "ibp": ("Integration by parts", "How do I integrate x times e to the x?",
                "Mathematics"),
        "newton": ("Newton's third law", "Why do action and reaction forces "
                   "not cancel out?", "Physics"),
    }.items():
        qid = make_question(app, student, title=title, body=body,
                            subject=subject, published=True)
        make_answer(app, qid, faculty)
        ids[key] = qid
    return student, faculty, ids


def test_similar_returns_labelled_library_matches(app, client):
    student, _, ids = _library(app)

    response = client.post(
        "/api/v1/ai/similar",
        headers=headers_for(app, student),
        json={"title": "How to integrate by parts", "body": "x e^x example"},
    )

    body = response.get_json()
    assert response.status_code == 200
    assert body["ai"]["label"] == "AI suggestion"
    assert body["ai"]["enabled"] is True
    top = body["data"]["suggestions"][0]
    assert top["id"] == ids["ibp"]
    assert top["answer_count"] == 1 and 0 < top["score"] <= 1
    assert "student_id" not in top


def test_gemini_similar_uses_only_candidate_library_ids(app, client, monkeypatch):
    student, _, ids = _library(app)
    app.config.update({
        "AI_USE_GEMINI": True,
        "GEMINI_API_KEY": "test-key",
    })
    monkeypatch.setattr(
        ai_service,
        "_gemini_json",
        lambda _prompt, _schema: {
            "matches": [
                {"id": ids["ibp"], "confidence": 0.93},
                {"id": 99999, "confidence": 1.0},
            ],
        },
    )

    response = client.post(
        "/api/v1/ai/similar",
        headers=headers_for(app, student),
        json={"title": "A question with different phrasing", "body": "Explain it"},
    )
    body = response.get_json()

    assert response.status_code == 200
    assert body["ai"]["engine"] == "gemini"
    assert body["data"]["suggestions"][0]["id"] == ids["ibp"]
    assert body["data"]["suggestions"][0]["score"] == 0.93
    assert len(body["data"]["suggestions"]) == 1


def test_gemini_subject_suggestion_only_returns_configured_subjects(
    app, client, monkeypatch
):
    student = make_user(app, "gemini-subject@example.com")
    app.config.update({
        "AI_USE_GEMINI": True,
        "GEMINI_API_KEY": "test-key",
    })
    monkeypatch.setattr(
        ai_service,
        "_gemini_json",
        lambda _prompt, _schema: {
            "suggestions": [
                {"subject": "not configured", "confidence": 0.99},
                {"subject": "mathematics", "confidence": 0.87},
            ],
        },
    )

    response = client.post(
        "/api/v1/ai/suggest-subject",
        headers=headers_for(app, student),
        json={"title": "A question with different phrasing", "body": "Explain it"},
    )
    body = response.get_json()

    assert response.status_code == 200
    assert body["ai"]["engine"] == "gemini"
    assert body["data"]["suggestions"] == [
        {"subject": "Mathematics", "confidence": 0.87},
    ]


def test_similar_never_returns_unpublished_questions(app, client):
    student, _, _ = _library(app)
    make_question(app, student, title="Secret cryptography doubt",
                  body="Elliptic curves", published=False)

    response = client.post(
        "/api/v1/ai/similar",
        headers=headers_for(app, student),
        json={"title": "Elliptic curves cryptography"},
    )

    assert response.get_json()["data"]["suggestions"] == []


def test_similar_validates_input_and_requires_sign_in(app, client):
    student, _, _ = _library(app)

    empty = client.post("/api/v1/ai/similar", headers=headers_for(app, student),
                        json={"title": " "})
    bad = client.post("/api/v1/ai/similar", headers=headers_for(app, student),
                      data="x", content_type="text/plain")
    blocked = client.post("/api/v1/ai/similar", json={"title": "hello"})

    assert empty.status_code == 400
    assert empty.get_json()["error"]["details"]["title"]
    assert bad.status_code == 400
    assert blocked.status_code == 401


def test_ai_can_be_switched_off(app, client):
    student, _, _ = _library(app)
    app.config["AI_ENABLED"] = False

    for path in ("/api/v1/ai/similar", "/api/v1/ai/suggest-subject"):
        response = client.post(path, headers=headers_for(app, student),
                               json={"title": "Integration by parts"})
        body = response.get_json()
        assert response.status_code == 200
        assert body["data"]["suggestions"] == []
        assert body["ai"]["enabled"] is False


def test_ai_never_writes_answers_or_ai_answer(app, client):
    student, faculty, _ = _library(app)
    with app.app_context():
        before = db.session.query(Answer).count()

    client.post("/api/v1/ai/similar", headers=headers_for(app, student),
                json={"title": "Newton action reaction"})
    client.post("/api/v1/ai/suggest-subject", headers=headers_for(app, student),
                json={"title": "Newton action reaction"})

    with app.app_context():
        assert db.session.query(Answer).count() == before
        assert db.session.query(Question).filter(
            Question.ai_answer.isnot(None)).count() == 0


def test_subject_suggestion_uses_labelled_questions(app, client):
    student = make_user(app, "stu@example.com")
    for i, (title, subject) in enumerate([
        ("Derivative of sine", "Mathematics"),
        ("Solve the integral of cosine", "Mathematics"),
        ("Limits and continuity of functions", "Mathematics"),
        ("Projectile motion velocity", "Physics"),
        ("Friction on an inclined plane", "Physics"),
    ]):
        make_question(app, student, title=title, subject=subject)

    response = client.post(
        "/api/v1/ai/suggest-subject",
        headers=headers_for(app, student),
        json={"title": "Integral of sine function"},
    )

    suggestions = response.get_json()["data"]["suggestions"]
    assert suggestions[0]["subject"] == "Mathematics"
    assert 0 < suggestions[0]["confidence"] <= 1
    assert set(suggestions[0]) == {"subject", "confidence"}  # no text leaks


def test_subject_suggestion_abstains_with_too_little_data(app, client):
    student = make_user(app, "stu@example.com")
    make_question(app, student, subject="Physics")

    response = client.post(
        "/api/v1/ai/suggest-subject",
        headers=headers_for(app, student),
        json={"title": "Why is the sky blue"},
    )

    assert response.get_json()["data"]["suggestions"] == []


def test_feedback_is_recorded_and_validated(app, client):
    student, _, ids = _library(app)
    headers = headers_for(app, student)

    ok = client.post("/api/v1/ai/feedback", headers=headers, json={
        "feature": "similar_questions", "target_id": ids["ibp"], "helpful": True})
    bad_feature = client.post("/api/v1/ai/feedback", headers=headers,
                              json={"feature": "x", "helpful": True})
    bad_helpful = client.post("/api/v1/ai/feedback", headers=headers, json={
        "feature": "similar_questions", "helpful": "yes"})

    assert ok.status_code == 201
    assert bad_feature.status_code == 400 and bad_helpful.status_code == 400
    with app.app_context():
        row = db.session.query(AiFeedback).one()
        assert row.helpful is True and row.target_id == ids["ibp"]
