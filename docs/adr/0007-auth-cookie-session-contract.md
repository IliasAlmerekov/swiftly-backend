# ADR-0007: Auth Contract Migration to HttpOnly Cookie Session

## Context

Current backend auth contract is bearer-based:

- `login/register/refresh` return `accessToken` and `refreshToken` in JSON body.
- `authMiddleware` reads `Authorization: Bearer ...`.

Frontend currently stores JWT in Web Storage, which is a critical risk for token theft in XSS scenarios.
Before implementation, backend and frontend need one shared target contract.

## Decision

Phase 0 contract is agreed as follows.

### 1. Session transport

- Browser auth secrets are transported only via HttpOnly cookies.
- API does not require bearer token in request headers for browser clients.
- Frontend calls authenticated endpoints with credentialed requests.

### 2. Auth endpoints (target contract)

- `POST /api/auth/login`
  Request: `{ email: string, password: string }`
  Response `200`: `{ user: AuthUser, authenticated: true }`
  Side effect: set auth cookies.
- `POST /api/auth/register`
  Request: `{ email: string, password: string, name: string }`
  Response `201`: `{ user: AuthUser, authenticated: true }`
  Side effect: set auth cookies.
- `GET /api/auth/me`
  Response `200`: `{ user: AuthUser, authenticated: true }`
  Response `401`: centralized auth error.
- `POST /api/auth/refresh`
  Request: no refresh token in body.
  Response `200`: `{ authenticated: true }`
  Side effect: rotate auth cookies.
- `POST /api/auth/logout`
  Request: `{ allSessions?: boolean }`
  Response `200`: `{ success: true, message: string }`
  Side effect: clear auth cookies and revoke refresh token(s).

`AuthUser` = `{ _id: string, email: string, name: string, role: 'user' | 'support1' | 'admin' }`.

### 3. Cookie policy

- Auth cookies use `HttpOnly; Secure`.
- Production cross-site SPA mode uses `SameSite=None`.
- Local development may use `SameSite=Lax` when appropriate.
- Cookie names are stable and versioned by contract.

### 4. CSRF policy

- State-changing routes (`POST/PUT/PATCH/DELETE`) require CSRF protection in browser flow.
- CSRF token is sent by frontend in `X-CSRF-Token`.
- Missing/invalid CSRF token returns `403`.

### 5. CORS policy

- Credentialed requests are enabled only for explicit allowlist origins.
- Wildcard `*` is not allowed when credentials are enabled.

### 6. Migration compatibility

- During migration, legacy token fields may temporarily remain in auth responses.
- Final target removes token body contract for browser clients.

### 7. Acceptance criteria for Phase 0

- [x] Current auth contract inspected (`routes/controller/use-cases/tests`).
- [x] Target endpoint + cookie + CSRF + CORS contract fixed in writing.
- [x] Frontend/backend ownership boundaries are explicit.
- [x] Legacy compatibility window documented.

## Alternatives

- Keep bearer/Web Storage flow and harden only with CSP.
- Move to opaque server sessions instead of JWT pair.
- In-memory token only on frontend.

## Consequences

- Better XSS resilience for auth secrets.
- Requires coordinated updates in middleware, controllers, OpenAPI, and contract tests.
- CSRF protection and credentialed CORS become mandatory parts of auth stack.
