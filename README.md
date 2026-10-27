# Student Doubt-Solving Platform

Students post doubts. Faculty answer them in writing. Faculty can publish an answered question to an anonymous library, and the ask form uses that library to point students at similar questions that already have answers.

- `backend/` Flask API (JWT, SQLAlchemy, Gemini-powered suggestions with local retrieval fallback)
- `frontend/` React + TypeScript + Vite single-page app

## What the AI does, and does not do

Automatic features are **suggestions only**:

| Feature | What it does |
| --- | --- |
| Similar questions | While a student types a title, Gemini ranks candidate published library questions by meaning. Links only. |
| Subject suggestion | Gemini suggests a subject from the configured list. Choosing one only fills the dropdown. |

When `GEMINI_API_KEY` is configured and `AI_USE_GEMINI=true`, draft text and candidate published-library question titles/bodies are sent to Google for the suggestions. Without a key, or if Gemini is unavailable, the app falls back to local TF-IDF matching. Set `AI_USE_GEMINI=false` to use only local matching, or `AI_ENABLED=false` to turn suggestions off entirely. Every response carries an `ai` block labelled "AI suggestion", and the interface shows it in a dashed lavender panel so it cannot be mistaken for a faculty answer. **It never writes an answer.**

The local fallback uses word overlap, not meaning, and may miss paraphrases.

## Run it locally

You need Python 3.11+ and Node 20+.

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then put two long random secrets in it
flask --app wsgi db upgrade
python run.py                   # http://127.0.0.1:5000

# Frontend (second terminal)
cd frontend
npm install
npm run dev                     # http://127.0.0.1:5173, /api is proxied to :5000
```

Open the frontend, create an account and choose **Student** or **Faculty**. You can use it straight away.

## Roles and rules

- **Student**: asks questions, sees only their own questions plus the library.
- **Faculty**: sees every student's question, answers, closes, publishes and unpublishes questions.
- The role is chosen at registration and enforced by the server on every request.
- **Anyone can pick Faculty.** There is no ID check and no approval step. Before real use, add an invite code or approval so only teachers can answer.
- Sessions last 60 minutes (`JWT_ACCESS_TOKEN_MINUTES`). There is no refresh token; the app sends the user back to sign in.

## Tests

```bash
cd backend && pip install -r requirements-dev.txt && pytest          # 135 tests
cd frontend && npm test                                              
cd frontend && npm run typecheck && npm run build
```

The browser test drives the whole product (sign-up as student and faculty, asking, answering, publishing, AI suggestions, session handling, mobile layout):

```bash
cd frontend && npm i -D playwright && npx playwright install chromium
# with a fresh backend database and `npm run dev` running:
npm run e2e
```

The backend needs higher rate limits for this run: set `LOGIN_RATE_LIMIT` and `REGISTER_RATE_LIMIT` to something like `1000 per minute`.

## Deploying

1. Build the frontend: `cd frontend && npm run build` and serve `frontend/dist` as static files.
2. Serve the API with gunicorn: `gunicorn wsgi:app`, behind a reverse proxy (nginx, Caddy) that sends `/api/` to it and everything else to `index.html`. Same origin means no CORS configuration. Set `TRUST_PROXY=true` only behind exactly one proxy.
3. Set strong `SECRET_KEY` and `JWT_SECRET_KEY`. Use PostgreSQL (`DATABASE_URL`) and a shared rate-limit store (`RATELIMIT_STORAGE_URI=redis://...`) when running more than one worker. The default memory store counts per worker.
4. Run `flask --app wsgi db upgrade` on each release.
5. Serve over HTTPS.

All settings are listed in `backend/.env.example`. The API contract is in the audit document; every response uses `{success, data | error:{code,message,details?}, meta?, ai?}`.

## Known limits

- No identity checks: anyone can register as faculty (see Roles and rules).
- Similar-question matching only works once faculty have published some answered questions, and it matches words, not meaning.
- Not built: password reset, email verification, a refresh token, faculty comments on library items, moderation help, and any way to switch an account off other than editing the database.
