# ADR-0007: Finalize Cookie-Session Auth Contract

## Status

Accepted and implemented on `2026-02-27`.

## Decision

Runtime is strict cookie-session for browser auth:

1. `POST /api/auth/register` and `POST /api/auth/login` return `{ user, authenticated: true }`.
2. `GET /api/auth/csrf` is a public CSRF bootstrap endpoint and returns `{ csrfToken }`.
3. `POST /api/auth/refresh` returns `{ authenticated: true }` and accepts refresh token from cookie only.
4. Protected browser auth routes (`/api/auth/logout`, `/api/auth/me`, `/api/auth/admins`) require cookie access context (no bearer fallback).
5. `POST /api/auth/logout` returns `{ success: true, message }`, where `message` is `"Logged out"` or `"Logged out from all sessions"`.
6. Browser state-changing endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) require valid `X-CSRF-Token` matching CSRF cookie context; missing/invalid token returns `403 CSRF_INVALID`.
7. Legacy compatibility flags are removed from runtime and config parsing.

## Consequences

- Legacy browser auth paths (bearer fallback, refresh body token, token response payloads) are removed.
- CSRF enforcement is centralized in middleware wiring at app composition level, not per controller.
- Rollback requires code change/redeployment, not env flag toggles.
- OpenAPI and auth docs represent strict runtime behavior only.
