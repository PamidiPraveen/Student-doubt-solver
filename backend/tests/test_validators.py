
from app.services.validators import validate_registration


def test_valid_registration_data():
    result = validate_registration(
        name=" Test Student ",
        email=" Student@Example.com ",
        password="Strong-Password-123!",
    )

    assert result["valid"] is True
    assert result["data"]["name"] == "Test Student"
    assert result["data"]["email"] == "student@example.com"


def test_empty_name_is_rejected():
    result = validate_registration(
        name="   ",
        email="student@example.com",
        password="Strong-Password-123!",
    )

    assert result["valid"] is False
    assert "name" in result["errors"]


def test_invalid_email_is_rejected():
    result = validate_registration(
        name="Test Student",
        email="invalid-email",
        password="Strong-Password-123!",
    )

    assert result["valid"] is False
    assert "email" in result["errors"]


def test_short_password_is_rejected():
    result = validate_registration(
        name="Test Student",
        email="student@example.com",
        password="short",
    )

    assert result["valid"] is False
    assert "password" in result["errors"]


def test_password_is_not_returned():
    password = "Strong-Password-123!"

    result = validate_registration(
        name="Test Student",
        email="student@example.com",
        password=password,
    )

    assert password not in result["data"].values()
