# Testing Strategy

## Test Types
- Unit tests: pure domain and use-case logic
- Integration tests: DB, HTTP, external services
- End-to-end tests: critical user flows only
- Contract tests: HTTP route/API contract compatibility per vertical slice (`tickets`, `auth`, `ai`)

## Rules
- Every bug fix must add a regression test
- Tests must be deterministic
- No real network calls in unit tests
- Mock/fake only at IO boundaries
- For slice migration merges, run tests in this order:
  1. `npm run test:contracts`
  2. `npm run test:integration`

## Quality
- Tests must assert behavior, not implementation
- Avoid brittle snapshots
- Clear test names describing behavior
