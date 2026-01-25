# Dependency Injection Rules

## General Rules
- Constructor injection by default
- Explicit dependencies, no service locator
- No hidden global state

## Boundaries
- Inject interfaces/ports at:
  - Databases
  - External APIs
  - File systems
  - Queues, caches

## Purity
- Domain logic must be pure and deterministic
- No framework types in domain layer
- No IO in domain or use-case logic

## Configuration
- Use typed configuration objects
- Avoid reading env/config directly inside business logic

## Anti-Patterns
- Injecting containers instead of dependencies
- Reflection-heavy magic wiring
- Static singletons
