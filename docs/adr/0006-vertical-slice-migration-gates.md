# ADR-0006: Vertical Slice Migration Gates (Tickets -> Auth -> AI)

## Context
Migration must be zero-downtime and API-safe. Without explicit gates, slices can be merged out of order, contract checks can be skipped, and legacy compatibility code can be removed before integration confidence exists.

## Decision
Introduce a machine-validated migration ledger:
- File: `docs/migration/vertical-slice-ledger.json`
- Validator: `scripts/validateVerticalSliceMigration.js`

Rules:
- Fixed migration order: `tickets -> auth -> ai`.
- Required per-slice flow: `transfer -> tests -> contract_check -> merge`.
- A later slice cannot be ahead of an earlier slice in stage.
- Legacy layer removal is blocked unless `integrationGreen=true`.
- While legacy layer is retained, configured legacy compatibility paths must exist.

CI integration:
- Run `npm run migration:check` in lint stage before merge.
- Run explicit contract and integration suites in CI test stage.

## Alternatives
1. Keep migration process only in PR descriptions.
- Rejected: not enforceable by automation.

2. Enforce only through reviewer checklist.
- Rejected: high chance of drift across multiple contributors.

## Consequences
Positive:
- Migration sequence is explicit and testable.
- API contract verification is a hard gate, not tribal knowledge.
- Legacy removal requires verified integration signal.

Negative:
- Additional maintenance overhead for migration ledger updates.
