# Configuration

## Required (non-test)
- MONGO_URI
- JWT_SECRET
- CLOUDINARY_URL or CLOUD_NAME/CLOUD_API_KEY/CLOUD_API_SECRET

## Recommended
- JWT_EXPIRES (default: 12h)
- PORT (default: 3001)
- NODE_ENV (development|test|production)
- CORS_ORIGIN (comma-separated origins)
- LOG_LEVEL (default: info, test uses silent)
- REQUEST_BODY_LIMIT (default: 1mb)

## Optional
- OPENAI_API_KEY
- REDIS_URL
- AI_CONVERSATION_TTL_MS

## Auth Runtime Contract (Phase 2)
- Phase-2 strict cookie-session contract switched on `2026-02-27`.
- `POST /api/auth/register` and `POST /api/auth/login` return `{ user, authenticated: true }`.
- `POST /api/auth/refresh` returns `{ authenticated: true }` and reads refresh token from cookie only.
- Browser protected auth routes (`/api/auth/logout`, `/api/auth/me`, `/api/auth/admins`) require cookie-based access context.

## Removed Environment Variables
- `AUTH_LEGACY_TOKEN_BODY`
- `AUTH_LEGACY_BEARER_AUTH`
- `AUTH_LEGACY_REFRESH_BODY`

