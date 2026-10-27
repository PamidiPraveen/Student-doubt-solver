
def register_test_user(client):
    return client.post(
        "/api/v1/auth/register",
        json={
            "name": "Test Student",
            "email": "student@example.com",
            "password": "Strong-Password-123!",
        },
    )


def test_login_returns_access_token(client):
    register_response = register_test_user(client)
    assert register_response.status_code == 201

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "STUDENT@example.com",
            "password": "Strong-Password-123!",
        },
    )

    assert response.status_code == 200

    body = response.get_json()
    assert body["success"] is True
    assert body["data"]["access_token"]
    assert body["data"]["token_type"] == "Bearer"
    assert body["data"]["user"]["role"] == "student"


def test_login_rejects_wrong_password(client):
    register_test_user(client)

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "student@example.com",
            "password": "Wrong-Password-123!",
        },
    )

    assert response.status_code == 401
    assert (
        response.get_json()["error"]["code"]
        == "INVALID_CREDENTIALS"
    )


def test_login_rejects_unknown_email(client):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "unknown@example.com",
            "password": "Strong-Password-123!",
        },
    )

    assert response.status_code == 401


def test_login_rejects_missing_fields(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "student@example.com"},
    )

    assert response.status_code == 400
