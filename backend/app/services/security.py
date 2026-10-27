
from werkzeug.security import check_password_hash, generate_password_hash


def normalize_email(email: str) -> str:
    """Remove surrounding whitespace and normalize email casing."""
    return email.strip().lower()


def hash_password(password: str) -> str:
    """Return a secure hash of a plaintext password."""
    return generate_password_hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Check a plaintext password against its stored hash."""
    return check_password_hash(password_hash, password)
