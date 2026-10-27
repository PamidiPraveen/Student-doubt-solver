import time

import jwt as pyjwt

from tests.helpers import headers_for, make_user


def test_unknown_route_returns_json_envelope(client):
    response = client.get("/api/v1/does-not-exist")

    assert response.status_code == 404
    body = response.get_json()
    assert body["success"] is False
    assert body["error"]["code"] == "NOT_FOUND"


def test_wrong_method_returns_json_envelope(client):
    response = client.get("/api/v1/auth/login")

    assert response.status_code == 405
    assert response.get_json()["error"]["code"] == "METHOD_NOT_ALLOWED"


def test_missing_token_returns_auth_required(client):
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "AUTH_REQUIRED"


def test_expired_token_returns_token_expired(app, client):
    user_id = make_user(app, "old@example.com")
    now = int(time.time())
    token = pyjwt.encode(
        {"sub": str(user_id), "type": "access", "jti": "t", "fresh": False,
         "iat": now - 100, "nbf": now - 100, "exp": now - 10},
        app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )

    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "TOKEN_EXPIRED"


def test_non_numeric_subject_is_rejected_not_a_server_error(app, client):
    now = int(time.time())
    token = pyjwt.encode(
        {"sub": "abc", "type": "access", "jti": "t", "fresh": False,
         "iat": now, "nbf": now, "exp": now + 600},
        app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )
    headers = {"Authorization": f"Bearer {token}"}

    for path in ("/api/v1/auth/me",):
        response = client.get(path, headers=headers)
        assert response.status_code == 401
        assert response.get_json()["error"]["code"] == "USER_NOT_AVAILABLE"


def test_oversized_request_returns_json_envelope(client):
    response = client.post(
        "/api/v1/auth/login",
        data=b"x" * (7 * 1024 * 1024),
        content_type="application/json",
    )

    assert response.status_code == 413
    assert response.get_json()["error"]["code"] == "REQUEST_TOO_LARGE"


def test_unhandled_error_returns_json_without_details(app):
    app.config["PROPAGATE_EXCEPTIONS"] = False

    @app.get("/api/boom")
    def boom():
        raise RuntimeError("secret detail")

    response = app.test_client().get("/api/boom")

    assert response.status_code == 500
    body = response.get_json()
    assert body["error"]["code"] == "INTERNAL_ERROR"
    assert "secret detail" not in response.get_data(as_text=True)


def test_cors_preflight_allows_configured_origin(client):
    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization",
        },
    )

    assert response.status_code == 200
    assert (
        response.headers["Access-Control-Allow-Origin"]
        == "http://localhost:5173"
    )
    allowed = response.headers["Access-Control-Allow-Headers"].lower()
    assert "authorization" in allowed and "content-type" in allowed


def test_cors_preflight_ignores_unknown_origin(client):
    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://evil.example",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert "Access-Control-Allow-Origin" not in response.headers


def test_health_reports_ai(client):
    data = client.get("/api/health").get_json()["data"]

    assert data["database"] == "connected"
    assert data["ai"] in {"enabled", "disabled"}


def test_login_rate_limit_returns_envelope(app, client):
    app.config["LOGIN_RATE_LIMIT"] = "3 per minute"
    codes = [
        client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@example.com", "password": "wrong-password-1"},
        ).status_code
        for _ in range(5)
    ]

    assert codes[:3] == [401, 401, 401]
    assert codes[3:] == [429, 429]
    body = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "wrong-password-1"},
    ).get_json()
    assert body["error"]["code"] == "RATE_LIMITED"


def test_register_rate_limit(app, client):
    app.config["REGISTER_RATE_LIMIT"] = "2 per hour"
    codes = [
        client.post(
            "/api/v1/auth/register",
            json={"name": "N", "email": f"u{i}@example.com",
                  "password": "Strong-Password-123!"},
        ).status_code
        for i in range(3)
    ]

    assert codes == [201, 201, 429]
