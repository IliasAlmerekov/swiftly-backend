# Zero-Downtime Vertical Slice Migration

This project migrates by vertical slices, in strict order:

1. `tickets`
2. `auth`
3. `ai`

The merge gate for every slice is:

1. `transfer`
2. `tests`
3. `contract_check`
4. `merge`

The machine-readable source of truth is:

- `docs/migration/vertical-slice-ledger.json`

Validation command:

```bash
npm run migration:check
```

Rules enforced by validator:

- Slice order must remain `tickets -> auth -> ai` (no big-bang migration).
- A slice cannot be ahead of a previous slice in migration stage.
- Each stage requires its prior checkpoints.
- Legacy layer can be removed only when `legacyLayer.integrationGreen=true`.
- While legacy layer is retained, all configured legacy compatibility paths must exist.
