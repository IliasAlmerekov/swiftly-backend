# Architecture Guidelines

## Default Architecture
- Modular Monolith
- Clear separation of concerns:
  - Domain (pure business logic)
  - Application / Use Cases
  - Adapters (HTTP, DB, CLI)
  - Infrastructure (frameworks, vendors)

## Layer Rules
- Dependencies point inward only
- Domain has NO framework or IO dependencies
- Controllers are thin (no business logic)

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
