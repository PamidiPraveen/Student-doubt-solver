
from app.services.security import (
    hash_password,
    normalize_email,
    verify_password,
)


def test_email_is_normalized():
    assert normalize_email(" Student@Example.com ") == "student@example.com"


def test_password_is_stored_as_hash():
    password = "Example-Password-123!"
    password_hash = hash_password(password)

    assert password_hash != password
    assert verify_password(password, password_hash)


def test_wrong_password_is_rejected():
    password_hash = hash_password("Correct-Password-123!")

    assert not verify_password("Wrong-Password-123!", password_hash)


def test_same_password_produces_different_hashes():
    password = "Example-Password-123!"

    first_hash = hash_password(password)
    second_hash = hash_password(password)

    assert first_hash != second_hash
    assert verify_password(password, first_hash)
    assert verify_password(password, second_hash)
