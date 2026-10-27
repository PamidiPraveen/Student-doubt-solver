
from app import db
from app.models import User
from app.services.security import verify_password


def test_register_creates_student_account(client, app):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Test Student",
            "email": "Student@Example.com",
            "password": "Strong-Password-123!",
            "role": "student",
        },
    )

    assert response.status_code == 201

    body = response.get_json()
    assert body["success"] is True
    assert body["data"]["email"] == "student@example.com"
    assert body["data"]["role"] == "student"
    assert "password" not in body["data"]
    assert "password_hash" not in body["data"]

    with app.app_context():
        user = db.session.get(User, body["data"]["id"])

        assert user is not None
        assert user.password_hash != "Strong-Password-123!"
        assert verify_password(
            "Strong-Password-123!",
            user.password_hash,
        )


def test_register_rejects_duplicate_email(client):
    payload = {
        "name": "Test Student",
        "email": "student@example.com",
        "password": "Strong-Password-123!",
    }

    first_response = client.post(
        "/api/v1/auth/register",
        json=payload,
    )
    second_response = client.post(
        "/api/v1/auth/register",
        json={
            **payload,
            "email": " Student@Example.com ",
        },
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 409


def test_register_rejects_short_password(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Test Student",
            "email": "student@example.com",
            "password": "short",
        },
    )

    assert response.status_code == 400
    assert "password" in response.get_json()["error"]["details"]


def test_register_rejects_missing_json(client):
    response = client.post(
        "/api/v1/auth/register",
        data="not-json",
        content_type="text/plain",
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "INVALID_JSON"


def _register(client, **overrides):
    payload = {
        "name": "Test Person",
        "email": "person@example.com",
        "password": "Strong-Password-123!",
        **overrides,
    }
    return client.post("/api/v1/auth/register", json=payload)


def test_student_registration_is_usable_immediately(client):
    response = _register(client, role="student")

    data = response.get_json()["data"]
    assert response.status_code == 201
    assert data["role"] == "student"


def test_role_defaults_to_student_when_omitted(client):
    data = _register(client).get_json()["data"]

    assert data["role"] == "student"


def test_faculty_registration_is_usable_immediately(client):
    response = _register(client, role="faculty")

    data = response.get_json()["data"]
    assert response.status_code == 201
    assert data["role"] == "faculty"


def test_new_faculty_can_answer_straight_away(app, client):
    from tests.helpers import make_question, make_user

    student = make_user(app, "s@example.com")
    question = make_question(app, student)
    _register(client, role="faculty")
    token = client.post(
        "/api/v1/auth/login",
        json={"email": "person@example.com", "password": "Strong-Password-123!"},
    ).get_json()["data"]["access_token"]

    response = client.post(
        f"/api/v1/questions/{question}/answers",
        headers={"Authorization": f"Bearer {token}"},
        json={"body": "Here is the answer."},
    )

    assert response.status_code == 201


def test_new_student_can_answer(app, client):
    from tests.helpers import make_question, make_user

    student = make_user(app, "s@example.com")
    question = make_question(app, student)
    _register(client, role="student")
    token = client.post(
        "/api/v1/auth/login",
        json={"email": "person@example.com", "password": "Strong-Password-123!"},
    ).get_json()["data"]["access_token"]

    response = client.post(
        f"/api/v1/questions/{question}/answers",
        headers={"Authorization": f"Bearer {token}"},
        json={"body": "Trying to answer."},
    )

    # Students may answer other people's doubts.
    assert response.status_code == 201
    assert response.get_json()["data"]["author_role"] == "student"


def test_cannot_register_as_admin_or_unknown_role(client):
    for role in ("admin", "root", "", None, 5):
        response = _register(client, role=role)
        assert response.status_code == 400, role
        assert "role" in response.get_json()["error"]["details"]
