# What changed, and why

## Backend

| Audit problem | Change |
| --- | --- |
| CORS missing | `Flask-CORS`, origins from `CORS_ORIGINS`. |
| inconsistent errors | One envelope for every error, including JWT failures, 404/405/413/429 and uncaught exceptions (`INTERNAL_ERROR`). |
| mixed token errors | Missing/invalid/expired tokens return 401 with `AUTH_REQUIRED`, `TOKEN_INVALID`, `TOKEN_EXPIRED`. |
| no rate limits on login/register | Configurable limits. |
| lists without paging or author names | Pagination with `meta`, search/filter, `student_name`, `faculty_name`, `answer_count`. |
| no close | `POST /questions/<id>/close`. |
| unpinned dependencies | Pinned `requirements.txt`, `wsgi.py` for gunicorn. |

New: anonymous library (`/library`, publish/unpublish), subjects list, AI endpoints (`/ai/similar`, `/ai/suggest-subject`, `/ai/feedback`).

### Registration now picks the role (replaces ID verification)

People choose **student** or **faculty** when they register and can use the site immediately.

Removed: the ID-card upload, OCR (Tesseract, Pillow, pytesseract), the college roster and its CSV import, verification attempts, faculty approval, the administrator role and every `/admin` endpoint, `create_admin.py`, `import_roster.py`, and `/auth/status`.

Migration `b7e3c1d94f20` drops the roster and attempts tables and the `verification_status` and `roster_record_id` columns, and turns any old `admin` account into `faculty`. Upgrade, downgrade, re-upgrade and the drift check were run.

**Consequence:** nothing stops a student from choosing faculty. See the README for what to add if that matters.

## Frontend

React 18, TypeScript (strict), Vite, React Router, TanStack Query, react-hook-form + zod. Pages for landing, sign in, register (with the student/faculty choice), student dashboard/questions/ask, question detail, faculty queue, library and profile. Keyboard and screen-reader support (skip link, labelled fields, live regions, 44px targets, visible focus), light and dark themes, reduced-motion respected.

The token is kept in memory and `sessionStorage`. Route guards only steer navigation; the server decides what is allowed.

## Defaults I chose

1. 60-minute sessions, no refresh token.
2. Students see only their own questions; AI duplicate search runs over the faculty-published anonymous library.

## Verified

- Backend: pytest suite passes.
- Frontend: typecheck clean, production build, unit tests.
- Browser: 21 end-to-end checks against the real backend (Chromium), desktop and 375px phone.
- gunicorn serves the app; CORS preflight answers correctly.

## Not verified

- PostgreSQL, Redis and multi-worker behaviour.
- Screen readers by hand; only structure and keyboard focus were checked.
