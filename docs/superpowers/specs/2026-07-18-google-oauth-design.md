# Google OAuth Login — Design

## Summary

Adds "Sign in with Google" to LovelaceLabs. The calculator and Ada remain
fully usable with zero login, exactly as they work today — signing in is
opt-in and exists to unlock account-tied features later (starting with
cross-device chat history, per the earlier chat-history design). This pass
also stands up the SQLite/Knex storage layer that design called for but never
built, since auth is the first feature that actually needs a persistent
`users` table.

## Scope

In scope:
- Google OAuth 2.0 sign-in via `@react-oauth/google` on the frontend and
  `google-auth-library` on the backend.
- Backend-issued session: after verifying the Google token, the backend
  issues its own signed JWT as an httpOnly cookie. The frontend never reads
  or stores a token directly.
- SQLite + Knex `users` table (`id`, `google_id`, `email`, `name`,
  `picture_url`, `created_at`) — the DB foundation from the chat-history spec,
  built now because auth needs it.
- `AuthContext` on the frontend, a real `/login` page, and a functional
  account menu in `TopAppBar` (currently a decorative icon).
- `requireAuth` middleware on the backend, ready for future login-gated
  routes (none exist yet — see Scope exclusions).

Explicitly out of scope for this pass (follow-up work):
- Merging an anonymous session's chat history into a real account on first
  login.
- Additional OAuth providers (GitHub, etc.) — the verification step is
  isolated into its own module specifically so adding one later doesn't
  touch session/cookie code, but only Google is implemented now.
- Password-based login, email verification, magic links.
- Roles or permission levels beyond "logged in or not."
- Actually gating any existing route behind `requireAuth` — nothing in the
  app currently needs to be login-only; this pass makes login *possible*,
  not required anywhere yet.

## Architecture

### Google Cloud setup (one-time, manual)

Free, no billing tier involved:
1. Create a project in [Google Cloud Console](https://console.cloud.google.com).
2. Configure the OAuth consent screen — type "External," status "Testing" is
   sufficient for a personal project (works for up to 100 users, no Google
   review/verification needed).
3. Create an OAuth 2.0 Client ID, application type "Web application," with
   `http://localhost:5173` as an authorized JavaScript origin (add the
   production origin later when one exists).
4. This produces a **Client ID** (public — safe to embed in frontend code)
   and a **Client Secret** (backend-only, goes in `backend/.env`,
   gitignored, documented in `backend/.env.example`).

### Backend (`backend/src/`)

New pieces:

| Path | Responsibility |
|---|---|
| `db/knexfile.js` | Knex config — `sqlite3` client for dev, connection details ready to swap to `pg` later without touching call sites elsewhere. |
| `db/migrations/0001_create_users.js` | Creates the `users` table. |
| `db/index.js` | Exports the configured Knex instance other modules query through. |
| `auth/verifyGoogleToken.js` | Thin wrapper around `google-auth-library`'s `OAuth2Client.verifyIdToken`. Takes a raw Google ID token, returns `{ googleId, email, name, pictureUrl }` or throws. Isolated the same way `providers/` isolates AI-provider calls — a second identity provider later is a new module here, not a rewrite of the routes below. |
| `auth/session.js` | Signs/verifies our own JWT (`jsonwebtoken`), and the cookie options (httpOnly, `Secure` in production, `SameSite=Lax`, ~7 day expiry). |
| `auth/requireAuth.js` | Express middleware — reads the session cookie, verifies it, attaches `req.user`, or responds `401`. Not wired to any route yet (nothing needs it this pass), but ready. |
| `routes/auth.js` | The three routes below. |

Routes:

| Route | Behavior |
|---|---|
| `POST /api/auth/google` | Body `{ credential }` (the Google ID token from the frontend button). Verifies it via `verifyGoogleToken`, upserts a `users` row keyed on `google_id`, sets the session cookie, responds with `{ id, email, name, pictureUrl }`. |
| `GET /api/auth/me` | Reads the cookie. Returns the profile if valid, `401` if not logged in (this is the normal "logged out" state, not treated as an error). |
| `POST /api/auth/logout` | Clears the session cookie. |

### Frontend (`frontend/src/`)

| Path | Responsibility |
|---|---|
| `auth/AuthContext.jsx` (new) | Calls `GET /api/auth/me` on mount, exposes `{ user, loading, login, logout }` via context. `login` triggers the Google button flow and POSTs the resulting credential; `logout` calls `/api/auth/logout` and clears local state. |
| `pages/Login.jsx` (new) | The actual login page — LovelaceLabs branding, the real `GoogleLogin` button from `@react-oauth/google`, an inline error state for a failed verification. |
| `components/layout/TopAppBar.jsx` | The existing decorative account icon becomes real: logged-out shows a "Sign in" link to `/login`; logged-in shows the Google avatar/name with a dropdown containing "Log out." |
| `App.jsx` | Wraps the app in `<AuthProvider>` and, for the first time in this codebase, `<BrowserRouter>` — `react-router-dom` has been a dependency all along but was never actually wired up. Scope here is minimal: just enough routing for `/login` to exist as a real page; the rest of the app doesn't need to become route-based for this feature. |

## Data flow

1. Logged-out visitor uses the calculator and Ada exactly as today — nothing
   about the existing experience changes.
2. Clicking "Sign in" in the top bar navigates to `/login`.
3. Clicking the Google button opens Google's own popup; the user
   authenticates with Google directly (LovelaceLabs never sees a password).
4. On success, the frontend receives a Google ID token and POSTs it to
   `/api/auth/google`.
5. Backend verifies the token with Google, upserts the `users` row, sets the
   session cookie, and responds with the profile.
6. `AuthContext` updates to the logged-in state; the top bar now shows the
   user's avatar; navigating back to `/` shows the calculator as normal, now
   with an authenticated session available to any feature that wants it
   later.
7. Logging out calls `/api/auth/logout`, clearing the cookie; the top bar
   reverts to "Sign in."

## Error handling

- Google token verification fails (expired, tampered, wrong audience) →
  `401` from `/api/auth/google`; `Login.jsx` shows an inline "Couldn't verify
  that sign-in, try again" message.
- `/api/auth/me` with a missing or invalid cookie → `401`, treated by
  `AuthContext` purely as "logged out," not surfaced as an error anywhere.
- Google Cloud Console misconfiguration (wrong origin, consent screen not
  set up) → Google's own button/popup surfaces its own error UI; not
  something this app's code needs to catch specially, but documented in
  setup notes so it's recognizable rather than mistaken for a bug here.

## Testing

- **Backend**: `node --test` — `verifyGoogleToken` against a mocked
  `google-auth-library` response (valid token, expired token, wrong
  audience); the three `/api/auth/*` routes against a temporary SQLite file;
  `requireAuth` middleware in isolation (valid cookie, missing cookie,
  tampered cookie).
- **Frontend**: Vitest — `AuthContext` with a mocked `/api/auth/me` fetch
  (logged-in and logged-out cases), `Login.jsx`, and `TopAppBar`'s two
  visual states.

## Open questions for later (not blocking this pass)

- Whether/how an anonymous session's existing chat history gets adopted into
  a real account the first time that browser logs in.
- Whether to add a second OAuth provider (GitHub, etc.) — the
  `auth/verifyGoogleToken.js` isolation is specifically meant to make this
  cheap later, but nothing beyond Google is built now.
- Session length/refresh strategy for long-lived logins — currently a flat
  ~7-day JWT with no refresh token; fine for a personal project, would need
  revisiting for anything with real security requirements.
