# Auth Contract (Phase 2 Final)

Phase-2 strict runtime switched on `2026-02-27`.

## Acceptance Baseline (Docs/Contract Scope)

- [ ] `docs/openapi.json` includes `GET /api/auth/csrf` with `200 { csrfToken }`.
- [ ] Auth session endpoints (`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`) return `{ user, authenticated: true }`.
- [ ] `POST /api/auth/refresh` is cookie-refresh only and returns `{ authenticated: true }`.
- [ ] Browser auth protected endpoints (`POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/auth/admins`) are cookie-only (no bearer fallback).
- [ ] Browser state-changing auth endpoints require `X-CSRF-Token`; invalid/missing token returns `403 CSRF_INVALID`.
- [ ] `POST /api/auth/logout` response message variants are documented: `"Logged out"` and `"Logged out from all sessions"`.

## Runtime Rules

- Browser auth is cookie-session only.
- Protected browser auth endpoints (`/api/auth/logout`, `/api/auth/me`, `/api/auth/admins`) require access token from cookie context.
- Bearer fallback is removed for browser auth routes.
- `POST /api/auth/refresh` reads refresh token from cookie only.
- Refresh token in request body is rejected with `400 AUTH_COOKIE_REQUIRED`.
- Browser state-changing endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) require a valid `X-CSRF-Token` that matches CSRF cookie context.
- Missing or invalid CSRF token returns `403 CSRF_INVALID`.
- Production CSRF cookie policy is `SameSite=None` and `Secure=true` for cross-site SPA compatibility.
- `docs/openapi.json` currently documents auth + health paths; CSRF runtime enforcement remains global for all state-changing `/api` routes.

## Endpoint Responses

### `POST /api/auth/register`

Response `201`:

```json
{
  "user": { "_id": "65f0c1...", "email": "user@example.com", "name": "User Name", "role": "user" },
  "authenticated": true
}
```

### `POST /api/auth/login`

Response `200`: `{ user, authenticated: true }`

### `POST /api/auth/refresh`

Response `200`:

```json
{
  "authenticated": true
}
```

### `POST /api/auth/logout`

Response `200`:

```json
{
  "success": true,
  "message": "Logged out"
}
```

`message` variants: `"Logged out"` or `"Logged out from all sessions"`.

### `GET /api/auth/csrf`

Response `200`:

```json
{
  "csrfToken": "base64url-token"
}
```

### `GET /api/auth/me`

Response `200`: `{ user, authenticated: true }`

### `GET /api/auth/admins`

Response `200`: `AuthUser[]`

## Error Shape

All auth errors use:

```json
{
  "code": "AUTH_REQUIRED",
  "message": "Not authorized",
  "details": {}
}
```

`details` is optional.

## Removed Compatibility Flags

- `AUTH_LEGACY_TOKEN_BODY`
- `AUTH_LEGACY_BEARER_AUTH`
- `AUTH_LEGACY_REFRESH_BODY`
