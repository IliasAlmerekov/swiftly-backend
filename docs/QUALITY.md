# Quality & Production Readiness

## Definition of Done
- Feature or fix implemented as requested
- Tests added and passing
- Docs updated if behavior or API changed
- No unnecessary complexity introduced

## Review Checklist

### Correctness
- Edge cases handled
- Errors are explicit and meaningful
- Timezones, locales, encoding considered

### Security
- Input validation at boundaries
- Authorization checks in the right layer
- No secrets in code, logs, or configs
- OWASP Top 10 risks considered where relevant

### Maintainability
- Clear naming, small functions
- Single Responsibility per module/class
- No circular dependencies

### Performance
- Avoid unnecessary IO and N+1 patterns
- No premature optimization
- Caching only with invalidation strategy

### Observability
- Logs at system boundaries
- Errors are traceable
- Metrics/hooks added if applicable

### Compatibility
- Backward compatibility preserved
- Migrations documented if required
