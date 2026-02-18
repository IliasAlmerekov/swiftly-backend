# AGENTS.md — Codex Operating Rules (Project Root)

Codex MUST read and follow this file at the start of every session.

## Baseline workflow
1. Determine goal and acceptance criteria (checkboxes).
2. Identify constraints (scope, safety, compatibility).
3. Identify what must be inspected (files, commands, tests).
4. If requirements are unclear, ask targeted questions BEFORE changes.
5. Propose a short plan (2–6 bullets), then execute.

## Editing rules
- Make the smallest safe change that solves the problem.
- Preserve existing style, conventions, and architecture.
- Prefer small, reviewable diffs over full rewrites.
- Update docs when behavior or usage changes.

## Quality bar (mandatory)
- Code must be production-ready, secure-by-default, and maintainable.
- Tests are required for new or changed behavior.
- Run format, lint, typecheck, tests, and build when feasible.
- Explain what changed, where, and why.
- Provide verification steps and list follow-ups if any.

## Container-first policy (required)
- Use containers for all tooling and dependencies.
- Follow existing Docker/Compose/Makefile workflows.
- If none exist, create a minimal container setup.
- NEVER install system packages on the host.

## Secrets & safety
- Never print or request secrets.
- Avoid commands that may expose sensitive data.
- Redact sensitive output when necessary.

## Architecture & design
- Default to a modular monolith with clear boundaries.
- Apply SOLID, DRY, and KISS pragmatically (see docs).
- Use Dependency Injection with explicit wiring.
- Keep domain logic pure and framework-agnostic.

## Documentation & decisions
- For non-trivial design decisions, add a short ADR.
- Keep AGENTS.md small; detailed rules live in /docs.

## References
- docs/QUALITY.md
- docs/ARCHITECTURE.md
- docs/DI.md
- docs/TESTING.md
