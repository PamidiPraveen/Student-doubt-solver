
def register_and_login(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Test Student",
            "email": "student@example.com",
            "password": "Strong-Password-123!",
        },
    )

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "student@example.com",
            "password": "Strong-Password-123!",
        },
    )

    assert response.status_code == 200
    return response.get_json()["data"]["access_token"]


def test_me_rejects_request_without_token(client):
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401


def test_me_rejects_invalid_token(client):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "TOKEN_INVALID"


def test_me_returns_authenticated_user(client):
    token = register_and_login(client)

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200

    body = response.get_json()
    assert body["success"] is True
    assert body["data"]["email"] == "student@example.com"
    assert body["data"]["role"] == "student"
