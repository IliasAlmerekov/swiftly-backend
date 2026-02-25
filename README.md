# Swiftly Backend

Backend API for the Swiftly Helpdesk platform (Node.js + Express + MongoDB).

## Quick Start

```bash
docker compose up -d
docker compose exec app npm ci
docker compose exec app cp .env.example .env
docker compose exec app npm run dev
```

## Main Commands

- `npm run dev` - run in development mode
- `npm start` - run production server
- `npm test` - run tests
- `npm run test:contracts` - run API contract tests for `tickets`, `auth`, `ai`
- `npm run test:integration` - run integration tests
- `npm run lint` - run linter
- `npm run format:check` - check formatting
- `npm run migration:check` - validate vertical-slice migration ledger and legacy removal gate
- `npm run secrets:scan` - local secret scan

## CI/CD

This repository has both pipelines:

- GitLab CI (`.gitlab-ci.yml`)
- GitHub Actions (`.github/workflows/ci.yml`)

Stages:

1. security (gitleaks)
2. lint
3. test
4. build (Docker, on tags)
5. deploy (Render hooks, on tags/manual)

Required GitHub secrets for deploy:

- `RENDER_DEPLOY_HOOK_URL`
- `RENDER_DEPLOY_HOOK_DEV_URL`

## Frontend

Frontend is maintained as a separate repository in the project owner's GitHub profile:

- <https://github.com/IliasAlmerekov>

## API Docs

When the server is running:

- `GET /api/docs`
