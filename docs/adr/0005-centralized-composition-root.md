# ADR-0005: Centralized Composition Root And Bootstrap

## Context
Dependency wiring was split across `src/container.js`, route modules, middleware defaults, and `src/server.js`.
This made dependency direction harder to enforce and allowed hidden infrastructure coupling in web-layer modules.

## Decision
Move runtime wiring to a single composition root:
- `src/composition/index.js` owns dependency assembly, route/controller wiring, app creation, and bootstrap lifecycle.
- `src/container.js` remains a compatibility shim that forwards to `src/composition/index.js`.
- Route modules are factory-based and receive controllers/middleware via injection.
- `src/server.js` delegates startup and shutdown to `createBootstrap`.

## Alternatives
1. Keep route-level wiring and only migrate `container.js`.
- Rejected: still leaves hidden dependency creation paths in web layer.

2. Introduce DI framework.
- Rejected: unnecessary complexity for current modular monolith size.

## Consequences
Positive:
- Single source of truth for wiring and lifecycle.
- Clear rule: controllers/routes do not create infrastructure clients.
- Easier testing via `createApp` and dependency injection.

Negative:
- More composition code in one file.
- Route tests needed updates to instantiate factories.

