# Architecture Guidelines

## Default Architecture
- Modular Monolith
- Clear separation of concerns:
  - Domain (pure business logic)
  - Application / Use Cases
  - Adapters (HTTP, DB, CLI)
  - Infrastructure (frameworks, vendors)
  - Composition (dependency wiring)

## Layer Directories (Approved)
- `src/domain`
- `src/application`
- `src/adapters`
- `src/infrastructure`
- `src/composition`

## Layer Rules
- Dependencies point inward only
- Domain has NO framework or IO dependencies
- Controllers are thin (no business logic)

## Allowed Import Matrix
Legend:
- `Y` = allowed import direction
- `N` = forbidden import direction

| From \ To | domain | application | adapters | infrastructure | composition |
| --- | --- | --- | --- | --- | --- |
| domain | Y | N | N | N | N |
| application | Y | Y | N | N | N |
| adapters | Y | Y | Y | N | N |
| infrastructure | Y | Y | N | Y | N |
| composition | Y | Y | Y | Y | Y |

Rules behind the matrix:
- `domain` contains entities/value objects/domain services only.
- `application` contains use cases and port interfaces only.
- `adapters` translates transport/input-output formats and calls `application`.
- `infrastructure` implements ports and integrates external systems.
- `composition` is the only place where concrete implementations are wired together.
- No layer is allowed to import from `composition`.
- `adapters` must not import concrete infrastructure implementations directly.

## Temporary Legacy Exceptions (Removal Deadline: 2026-06-30)
These exceptions are transitional and MUST be removed by the deadline:

1. `src/services/aiService.js` imports `openai` and models directly (`src/models/aiLogs.js`, `src/models/solutionModel.js`).

Removal condition:
- Replace direct model/vendor usage with application ports and infrastructure adapters wired in `src/composition`.

## When to Introduce More Complexity
Introduce microservices ONLY if:
- Independent deployment is required
- Independent scaling is required
- Teams are organizationally independent
- Operational cost is justified

## Patterns
- Prefer composition over inheritance
- Prefer explicit over implicit behavior
- Prefer data-in / data-out functions

## Anti-Patterns
- God services
- Anemic domain with logic in controllers
- Over-abstraction with single implementation
