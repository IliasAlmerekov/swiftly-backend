# ADR-0004: AI Service Split Into Application + Infrastructure

## Context
`src/services/aiService.js` previously mixed:
- orchestration/use-case flow,
- policy and safety decision logic,
- OpenAI vendor calls,
- Mongo knowledge-base search and request logging.

This made unit testing hard, violated architecture boundaries, and kept a temporary legacy exception open in `docs/ARCHITECTURE.md`.

## Decision
Split AI functionality into explicit layers:
- `src/application/ai`:
  - use-cases (`generateAIResponse`, `detectITIntent`, `analyzePriority`, `categorizeIssue`, `testConnection`),
  - pure policy/safety logic,
  - ports (`LLMPort`, `KnowledgeBasePort`).
- `src/infrastructure/ai`:
  - `OpenAILLMAdapter` implements `LLMPort`,
  - `MongooseKnowledgeBaseAdapter` implements `KnowledgeBasePort`.
- `src/composition/aiService.js` wires adapters and use-cases.
- `src/services/aiService.js` remains a stable facade export for routes.

## Alternatives
1. Keep `aiService` monolithic and only add tests.
- Rejected: preserves architecture debt and IO coupling.

2. Move all logic directly into routes/controllers.
- Rejected: violates thin-controller rule and worsens reuse/testing.

3. Introduce microservice for AI immediately.
- Rejected: operational overhead not justified for current scope.

## Consequences
Positive:
- Clear separation between policy/orchestration and infrastructure IO.
- Unit tests for policy/intent/ticket decision run with no network dependencies.
- Legacy exception for direct OpenAI/model usage in `aiService` is removed.

Negative:
- More modules and wiring complexity.

Risks:
- Behavior drift during extraction.

Mitigation:
- Keep external `aiService` method contract unchanged and cover extracted decisions with unit tests.

