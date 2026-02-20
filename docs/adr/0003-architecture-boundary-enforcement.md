# ADR-0003: Architecture Boundary Enforcement

## Context
The project already follows a modular monolith style, but boundary rules are not yet enforced consistently in code.
Some modules still import infrastructure concerns directly (models, vendor SDKs, framework details), which increases coupling and makes testing and migration harder.

We need a single, explicit definition of:
- target architecture layers,
- allowed dependency directions,
- temporary exceptions and their removal deadline.

## Decision
Adopt and enforce the following layer model:
- `src/domain`
- `src/application`
- `src/adapters`
- `src/infrastructure`
- `src/composition`

Dependency direction is inward:
- `domain` is independent and has no framework/IO dependencies.
- `application` depends on `domain` only, plus local abstractions (ports/interfaces).
- `adapters` depend on `application` and `domain` only.
- `infrastructure` may depend on `application`/`domain` to implement ports.
- `composition` wires concrete dependencies and may import all layers.

Import policy is documented in `docs/ARCHITECTURE.md` as an allowed import matrix.

Temporary legacy exceptions are allowed until **2026-06-30** and listed in `docs/ARCHITECTURE.md`.

## Alternatives
1. Keep architecture guidance high-level only (no explicit matrix).
- Rejected because it is ambiguous and hard to enforce in reviews.

2. Full immediate rewrite to strict clean architecture.
- Rejected due to high delivery risk and potential regressions.

3. Enforce rules only in CI without documenting transitions.
- Rejected because migration context and exceptions would remain implicit.

## Consequences
Positive:
- Clear, testable dependency boundaries.
- Safer refactoring and easier replacement of infrastructure vendors.
- Better unit test isolation for domain/application logic.

Negative:
- Short-term migration overhead while removing legacy imports.
- Additional review and CI checks to keep boundaries intact.

Risks:
- If exceptions are not burned down by deadline, architecture debt persists.

Mitigation:
- Track exception removal as P0/P1 tasks in the architecture hardening backlog.
