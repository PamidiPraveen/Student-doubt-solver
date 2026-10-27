
import re


ALLOWED_REGISTRATION_ROLES = {"student", "faculty"}


def validate_registration(
    name: str,
    email: str,
    password: str,
    role: str = "student",
) -> dict:
    """Validate registration fields and return safe, normalized values."""
    errors = {}

    if not isinstance(name, str) or not name.strip():
        errors["name"] = "Name is required."
    elif len(name.strip()) > 120:
        errors["name"] = "Name must be 120 characters or fewer."

    if not isinstance(email, str) or not email.strip():
        errors["email"] = "Email is required."
    else:
        normalized_email = email.strip().lower()

        if len(normalized_email) > 255:
            errors["email"] = "Email must be 255 characters or fewer."
        elif not re.fullmatch(
            r"[^@\s]+@[^@\s]+\.[^@\s]+",
            normalized_email,
        ):
            errors["email"] = "Enter a valid email address."

    if not isinstance(password, str):
        errors["password"] = "Password is required."
    elif len(password) < 12:
        errors["password"] = "Password must be at least 12 characters."
    elif len(password) > 128:
        errors["password"] = "Password must be 128 characters or fewer."

    if role not in ALLOWED_REGISTRATION_ROLES:
        errors["role"] = "Choose student or faculty."

    if errors:
        return {"valid": False, "errors": errors}

    return {
        "valid": True,
        "data": {
            "name": name.strip(),
            "email": email.strip().lower(),
            "role": role,
        },
    }
