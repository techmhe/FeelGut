# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (from `server/` directory)
```bash
npm start       # Start server on port 3000 (or $PORT)
npm run dev     # Same as start (no hot reload configured)
npm audit       # Check for dependency vulnerabilities
```

### Frontend
The frontend is a single `index.html` file with no build step. Serve it via the Express backend or:
```bash
python3 -m http.server 8000   # Simple static server for frontend-only dev
```

### No test infrastructure exists — there are zero tests in this project.
### No linting/formatting tools are configured.

## Architecture

This is a two-tier application: a vanilla JS single-page app served as a single HTML file, backed by a Node.js/Express API server.

**Frontend (`index.html`, ~2,233 lines):**
- Entirely contained in one HTML file with embedded CSS and JavaScript. No bundler, no modules, no dependencies.
- State is managed via global variables (`currentUser`, `currentLanguage`, `currentFilter`, `symptomsData`).
- Supports EN/DE via a `translations` object in JS; language stored in cookie/server user settings.
- All API calls go to `/api/*` (relative path, so frontend must be served by or proxied through the backend).
- Auth state is based on an httpOnly JWT cookie — the frontend calls `GET /api/auth/me` on load to hydrate `currentUser`.

**Backend (`server/server.js`, `server/database.js`):**
- Express 4 with `cors`, `cookie-parser`, `bcryptjs`, `jsonwebtoken`, `sql.js`.
- JWT tokens stored in httpOnly cookies (`authToken`), 7-day expiry.
- Routes: `POST /api/auth/{register|login|logout}`, `DELETE /api/auth/delete-account`, `PUT /api/auth/change-password`, `GET /api/auth/me`, `GET|POST|DELETE /api/entries`, `GET /api/symptoms`, `PUT /api/user/settings`.
- `authenticateToken` middleware validates the JWT cookie and attaches `req.user` to protected routes.

**Database (`server/feelgut.db`):**
- SQL.js (SQLite compiled to WASM) runs the DB in-memory and persists to a binary file on disk after every write. The full DB is loaded into RAM on startup.
- Tables: `users`, `entries` (food and symptom logs, FK to users with CASCADE delete), `symptoms` (13 predefined entries seeded at startup).
- `server/database.js` wraps SQL.js with helper methods (`run`, `get`, `all`, `serialize`/`deserialize` for persistence).

**Static data:**
- `data/symptoms.json` exists but is **not used by the backend** — symptoms are hard-coded in `database.js` and seeded into the SQLite DB at startup.

## Known Security Issues (fix before production)

These are real vulnerabilities in the current codebase:

1. **CORS allows all origins with credentials** (`server/server.js:14-17`): `origin: true` + `credentials: true` enables cross-origin cookie theft. Must be restricted to the actual frontend origin.

2. **Hardcoded JWT secret fallback** (`server/server.js:11`): Falls back to `'feelgut-secret-key-change-in-production'` if `JWT_SECRET` env var is missing. The server should refuse to start if `JWT_SECRET` is not set in production.

3. **No rate limiting**: Login and register endpoints have no brute-force protection. Add `express-rate-limit`.

4. **No security headers**: Missing `helmet` or equivalent. No CSP, no `X-Frame-Options`, no `X-Content-Type-Options`.

5. **Logout does not invalidate JWT**: The `/api/auth/logout` endpoint only clears the cookie — the token remains valid for 7 days. Implement a token blacklist or switch to short-lived tokens + refresh tokens.

6. **No input length validation on entry descriptions**: An attacker can send arbitrarily large descriptions. Add a max-length check server-side.

7. **Weak password requirements**: Only 6-character minimum enforced.

8. **Database file permissions**: `feelgut.db` is written to disk with default umask. Should be created with mode `0600`.

## Structural Debt

- The entire frontend in a single 2,233-line file makes maintenance difficult. Future work should split it into components (consider Vite + vanilla-JS or a lightweight framework).
- No `.env.example` file exists — `JWT_SECRET` and `PORT` are undocumented environment variables.
- `data/symptoms.json` is dead code — it is not imported or read anywhere at runtime.
- The SQL.js pattern of loading the entire DB into memory and writing it on every mutation does not scale; consider replacing with `better-sqlite3` (native bindings, synchronous, no full-DB reload).
