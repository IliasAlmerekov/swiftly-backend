# Security Checklist & Threat Model

## Scope

- Backend API (Express + MongoDB + Redis)
- Auth migration track: Phase 1 runtime compatibility -> Phase 2 strict cookie-session target
- Contract sources: `docs/openapi.json`, `docs/AUTH_CONTRACT.md`, `docs/adr/0007-auth-cookie-session-contract.md`
- External services: Cloudinary, OpenAI

## Assumptions

- TLS is terminated by reverse proxy/platform (Render/NGINX/etc).
- Secrets are provided via environment variables.
- Browser clients use `credentials: include` for authenticated calls.
- Runtime is in strict cookie-session mode for browser auth.

## Current Runtime Controls (as-is)

- Cookie auth is enabled (`HttpOnly`; `Secure` in production config).
- Bearer compatibility is removed for browser auth routes.
- Auth endpoints return strict session payloads only (`{ user, authenticated }` / `{ authenticated }`).
- Refresh token source is cookie-only for `/api/auth/refresh`.
- CSRF protection is mandatory for all browser state-changing methods (`POST`, `PUT`, `PATCH`, `DELETE`) using `X-CSRF-Token` double-submit cookie validation.
- Credentialed CORS must use explicit origin allowlist (no wildcard with credentials).
- Standardized error shape is present: `{ code, message, details? }`.
- Request logging redacts `Authorization`, `Cookie`, and `X-CSRF-Token` headers.
- OpenAPI coverage note: current `docs/openapi.json` covers auth + health endpoints; CSRF runtime enforcement still applies to all state-changing `/api` routes.

## Checklist (Implemented / Required Baseline)

- Input validation at boundaries (Zod DTOs).
- Centralized error handling with safe responses.
- Rate limiting on auth + AI routes.
- Security headers via Helmet + API CSP.
- Request size limits.
- Logging with redaction for sensitive auth/cookie fields.
- Non-root container user.
- Dependency vulnerability scan (`npm audit`).

## Remaining Risks / Out of Scope
- Swagger UI exposure remains environment-specific risk.
- External providers (OpenAI/Cloudinary/Redis) availability and security are external dependencies.

## Evidence

- Security checks should include lint, tests, and dependency scanning in CI.
- Contract checks should validate OpenAPI and auth contract consistency during migration.

## Prompt Injection and MCP Hardening

- Treat MCP output, external docs, issue text, and package metadata as untrusted data.
- Keep command approval manual for secret access, CI edits, publish/deploy, and outbound network calls.
- Allowlist MCP servers and pin versions for MCP clients and npm packages.
- Keep local AI tool configs (`.cursor/`, `.claude/`, `.windsurf/`, `.continue/`) out of git.
- Require owner review for workflow files, lockfiles, and MCP config files via CODEOWNERS.
- Keep GitHub Actions default permissions minimal (`contents: read`) and elevate only when needed.
- Rotate secrets immediately after suspicious dependency/workflow changes.
