# Backend

Flask REST API for the Student Doubt-Solving Platform. See the top-level `README.md` for the whole project.

## Features

- Registration (student or faculty), login, password hashing, JWT Bearer tokens.
- Questions, faculty answers, closing, and an anonymous library of published answered questions.
- Local retrieval-only AI helpers (similar questions, subject suggestion) with feedback capture.
- One JSON envelope for every response and error, rate limits, CORS, pagination.
- Database migrations (Flask-Migrate) and a pytest suite.

## Setup

Python 3.11 or newer.

```bash
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # set SECRET_KEY and JWT_SECRET_KEY to long random values
flask --app wsgi db upgrade
python run.py                        # development server on http://127.0.0.1:5000
```

Production: `gunicorn wsgi:app` behind a reverse proxy. Use PostgreSQL (`DATABASE_URL`) and a shared rate-limit store (`RATELIMIT_STORAGE_URI`) with more than one worker.

Tests: `pip install -r requirements-dev.txt && pytest`.

## Endpoints

Every path is under `/api/v1` except health. All except register, login and health need `Authorization: Bearer <token>`.

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | anyone | Service, database and AI status |
| POST | `/auth/register` | anyone | `{name, email, password, role}`; role is `student` (default) or `faculty` |
| POST | `/auth/login` | anyone | Returns `access_token` and the user |
| GET | `/auth/me` | signed in | Current user |
| GET | `/subjects/` | signed in | Subjects offered |
| GET | `/questions/` | signed in | Students see their own, faculty see all. Filters: `status`, `subject`, `q`, `limit`, `offset` |
| POST | `/questions/` | student | Ask a question |
| GET | `/questions/<id>` | owner or faculty | One question |
| DELETE | `/questions/<id>` | question author | Delete a question and its answers |
| POST | `/questions/<id>/close` | owner or faculty | Close it |
| POST | `/questions/<id>/publish`, `/unpublish` | faculty | Add or remove from the anonymous library (needs an answer to publish) |
| GET | `/questions/<id>/answers` | owner or faculty | Answers |
| POST | `/questions/<id>/answers` | faculty | `{body}` |
| DELETE | `/questions/<id>/answers/<answer_id>` | answer author | Delete an answer |
| GET | `/library/`, `/library/<id>` | signed in | Published questions without student details |
| POST | `/ai/similar`, `/ai/suggest-subject` | student, faculty | `{title, body?}`; responses carry an `ai` block labelled "AI suggestion" |
| POST | `/ai/feedback` | student, faculty | `{feature, helpful, target_id?}` |

Success: `{success: true, data, meta?, ai?}`. Failure: `{success: false, error: {code, message, details?}}`.

## Security notes

- Anyone can choose "faculty" when registering. Faculty can answer questions and publish to the library. If you need to restrict that, add an invite code or approval step before using this with real students.
- The role is stored on the server and read from the database on every request, never from the token or the client.
- Never commit `.env`, secrets or local databases.


## Content moderation (Gemini)

Every question and answer is checked before it is saved. A blocked post is not stored; the author sees why and gets a notification.

1. **Local filter** (always on): profanity, disguised spellings, threats and, in strict mode, mild insults such as "stupid" or "idiot".
2. **Gemini** (when `GEMINI_API_KEY` is set): judges meaning and tone, so a post with no bad word but a hostile, sarcastic or demeaning tone is also rejected.

Question submissions are also checked against questions already on the server. Gemini confirms likely semantic duplicates when configured; a high-confidence duplicate is not saved, and the author receives a notification linking to the existing question. Without a usable Gemini response, only very close text matches are blocked.

| Variable | Default | Meaning |
| --- | --- | --- |
| `GEMINI_API_KEY` | unset | Turns the Gemini layer on. Get a key in Google AI Studio. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Any Gemini model that supports JSON output. Check the current names in Google's docs. |
| `MODERATION_STRICTNESS` | `strict` | `standard` rejects clearly offensive content only. |
| `MODERATION_FAIL_CLOSED` | `false` | If Gemini is unreachable (quota, network): `true` asks the user to retry (HTTP 503, no penalty); `false` falls back to the local filter. |
| `MODERATION_USE_GEMINI` | `true` | Set `false` to switch Gemini off while keeping the key. |

Privacy: with Gemini on, the text of each new question and answer is sent to Google for moderation; likely existing question matches are also sent for duplicate comparison. Keep the key in `.env`; it is sent in a header, never in a URL.

If question submission returns `MODERATION_UNAVAILABLE` and the backend logs Gemini HTTP 404, check that `GEMINI_MODEL` names a model available to the configured API key and that it supports `generateContent`. The default is `gemini-2.5-flash`; override it in `backend/.env` with a currently available model name, then restart the backend. The local word filter remains active, but with `MODERATION_FAIL_CLOSED=true`, posts cannot be submitted until Gemini is reachable.

## AI suggestions (Gemini)

When `GEMINI_API_KEY` is set and `AI_USE_GEMINI=true`, Gemini ranks candidate published library questions by meaning and suggests a subject from `SUBJECTS`. The student's draft and candidate published question text are sent to Google for these suggestions. If Gemini is not configured or cannot be reached, local TF-IDF suggestions are used instead. Configure `AI_USE_GEMINI=false` to use only the local engine. These are suggestions only; AI never writes a question answer.

| Variable | Default | Meaning |
| --- | --- | --- |
| `AI_USE_GEMINI` | `true` | Use Gemini for suggestions when an API key is configured. |
| `AI_GEMINI_TIMEOUT` | `8` | Per-request timeout in seconds before falling back to local matching. |
