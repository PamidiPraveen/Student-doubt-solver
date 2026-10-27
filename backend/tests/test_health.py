from app import create_app, db


def test_health_endpoint_returns_success_and_database_status(client):
    response = client.get("/api/health")

    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["status"] == "healthy"
    assert data["data"]["database"] == "connected"


def test_health_creates_missing_sqlite_database_directory(tmp_path):
    database_path = tmp_path / "new" / "nested" / "app.db"
    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "test-only-secret-key-at-least-32-bytes-long",
        "SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_path.as_posix()}",
    })

    response = app.test_client().get("/api/health")
    with app.app_context():
        db.session.remove()
        db.engine.dispose()

    assert response.status_code == 200
    assert database_path.is_file()
