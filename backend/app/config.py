
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
INSTANCE_DIR = BACKEND_DIR / "instance"

# Load backend/.env for local development.
# In production, configure environment variables in the deployment platform.
load_dotenv(BACKEND_DIR / ".env")


def _csv(name, default=""):
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def _flag(name, default):
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


DEFAULT_SUBJECTS = (
    "Mathematics,Physics,Chemistry,Biology,Computer Science,"
    "Programming,Electronics,English,Economics,History"
)


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or SECRET_KEY

    # Login session length. There is no refresh token; users sign in again
    # when it expires.
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_MINUTES", "60"))
    )

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{(INSTANCE_DIR / 'app.db').as_posix()}",
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Requests are small JSON documents; reject anything larger than 1 MB.
    MAX_CONTENT_LENGTH = 1024 * 1024

    # Browser origins allowed to call the API (comma separated).
    CORS_ORIGINS = _csv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )

    # Set true when running behind exactly one reverse proxy so that the
    # client IP (used by rate limits) comes from X-Forwarded-For.
    TRUST_PROXY = _flag("TRUST_PROXY", "false")

    RATELIMIT_STORAGE_URI = os.getenv(
        "RATELIMIT_STORAGE_URI",
        "memory://",
    )
    RATELIMIT_HEADERS_ENABLED = True
    LOGIN_RATE_LIMIT = os.getenv("LOGIN_RATE_LIMIT", "10 per minute")
    REGISTER_RATE_LIMIT = os.getenv("REGISTER_RATE_LIMIT", "10 per hour")
    AI_RATE_LIMIT = os.getenv("AI_RATE_LIMIT", "30 per minute")

    # Subjects offered by the interface and used by AI subject suggestions.
    SUBJECTS = _csv("SUBJECTS", DEFAULT_SUBJECTS)

    # Gemini suggestions use local TF-IDF as a fallback.
    AI_ENABLED = _flag("AI_ENABLED", "true")
    AI_USE_GEMINI = _flag("AI_USE_GEMINI", "true")
    AI_SIMILARITY_THRESHOLD = float(os.getenv("AI_SIMILARITY_THRESHOLD", "0.2"))
    AI_MAX_SUGGESTIONS = int(os.getenv("AI_MAX_SUGGESTIONS", "5"))
    AI_GEMINI_TIMEOUT = float(os.getenv("AI_GEMINI_TIMEOUT", "8"))

    # Content moderation. The local word filter is always available; the
    # Gemini check is added on top when a key is configured.
    MODERATION_ENABLED = _flag("MODERATION_ENABLED", "true")
    GEMINI_API_KEY = (os.getenv("GEMINI_API_KEY") or "").strip()
    MODERATION_USE_GEMINI = _flag("MODERATION_USE_GEMINI", "true")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    MODERATION_TIMEOUT = float(os.getenv("MODERATION_TIMEOUT", "8"))
    # strict: reject mild insults and any hostile, demeaning or sarcastic
    # tone. standard: reject clearly offensive content only.
    MODERATION_STRICTNESS = (
        os.getenv("MODERATION_STRICTNESS", "strict").strip().lower()
    )
    # If Gemini is configured but unreachable, keep local moderation available
    # unless an operator explicitly requires Gemini for every submission.
    MODERATION_FAIL_CLOSED = _flag("MODERATION_FAIL_CLOSED", "false")
