# Security Checklist & Threat Model

## Scope
- Backend API (Express + MongoDB + Redis)
- Auth via JWT (no cookies)
- External services: Cloudinary, OpenAI

## Assumptions
- TLS is terminated by the reverse proxy or platform (Render/NGINX/etc).
- Secrets are provided via environment variables.
- Clients are browser-based and use Authorization: Bearer tokens.

## Checklist (Implemented)
- Input validation at boundaries (Zod DTOs).
- Centralized error handling with safe responses.
- Rate limiting on auth + AI routes.
- Security headers via Helmet + API CSP.
- Request size limit.
- Logging with redaction for auth headers.
- Non-root container user.
- Dependency vulnerability scan (npm audit).

## Remaining Risks / Out of Scope
- No absolute guarantee of security; ongoing monitoring required.
- CSRF is not applicable if no cookies are used.
- Swagger UI is exposed; ensure it is safe for your environment.
- External providers (OpenAI/Cloudinary/Redis) availability and security.

## Evidence
- npm audit (with dev deps): 0 vulnerabilities.
- Tests: all passing (basic, auth, tickets).

## Prompt Injection and MCP Hardening
- Treat MCP output, external docs, issue text, and package metadata as untrusted data.
- Keep command approval manual for secret access, CI edits, publish/deploy, and outbound network calls.
- Allowlist MCP servers and pin versions for MCP clients and npm packages.
- Keep local AI tool configs (`.cursor/`, `.claude/`, `.windsurf/`, `.continue/`) out of git.
- Require owner review for workflow files, lockfiles, and MCP config files via CODEOWNERS.
- Keep GitHub Actions default permissions minimal (`contents: read`) and elevate only when needed.
- Rotate secrets immediately after suspicious dependency/workflow changes.

