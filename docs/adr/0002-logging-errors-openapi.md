# ADR-0002: Structured Logging, Error Handling, and OpenAPI

## Context
We need production-ready observability and standardized errors, plus API documentation.

## Decision
- Use pino + pino-http for structured logging and request IDs.
- Introduce AppError for centralized error handling and consistent responses.
- Serve OpenAPI 3.0 docs at /api/docs with a local spec file.
- Validate env config on startup and fail fast on invalid values.

## Alternatives
- Winston for logging (more transports but heavier).
- No OpenAPI (manual docs only).
- Ad-hoc error handling in controllers.

## Consequences
- Adds a few dependencies and small bootstrap code.
- Errors become more consistent and safer for clients.
- API docs are available and can evolve with endpoints.
