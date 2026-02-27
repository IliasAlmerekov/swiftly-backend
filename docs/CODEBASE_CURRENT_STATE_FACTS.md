# Codebase Current State Facts (swiftly-backend)

Code snapshot date: 2026-02-27.

## 1. Stack and dependencies
- Node.js ESM backend: `main=src/server.js`, `"type": "module"`, engines `node >=20`, `npm >=10` ([package.json](../package.json#L5), [package.json](../package.json#L6), [package.json](../package.json#L70)).
- Runtime dependencies include `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `helmet`, `express-rate-limit`, `cors`, `redis`, `openai`, `cloudinary`, `multer`, `pino`, `swagger-ui-express`, `zod` ([package.json](../package.json#L38)).
- Test/tooling dependencies include `jest`, `supertest`, `mongodb-memory-server`, `eslint`, `prettier`, `dependency-cruiser` ([package.json](../package.json#L58)).
- LockfileVersion = 3 ([package-lock.json](../package-lock.json#L4)).

## 2. Entry points and startup
- Main entrypoint: [src/server.js](../src/server.js#L1).
- Bootstrap performs `mongoose.connect(config.mongoUri)` and `app.listen(config.port)` ([src/composition/index.js](../src/composition/index.js#L252)).
- NPM scripts include `start`, `dev`, `render-start` ([package.json](../package.json#L8)).
- Docker CMD is `npm start`; Render healthcheck is `/api/health` ([Dockerfile](../Dockerfile#L31), [render.yaml](../render.yaml#L7)).

## 3. Modules and responsibilities
- Composition root: [src/composition/index.js](../src/composition/index.js#L64).
- Documented architectural layers: `domain/application/adapters/infrastructure/composition` ([docs/ARCHITECTURE.md](./ARCHITECTURE.md#L12)).
- Service facades: [src/services/ticketService.js](../src/services/ticketService.js#L3), [src/services/userService.js](../src/services/userService.js#L1), [src/services/solutionService.js](../src/services/solutionService.js#L3), [src/services/AIServiceFacade.js](../src/services/AIServiceFacade.js#L8).
- Controllers delegate to services and use DTO validation: [src/controllers/ticketController.js](../src/controllers/ticketController.js#L12), [src/controllers/solutionController.js](../src/controllers/solutionController.js#L11).

## 4. API and contracts
- Mount points: `/api/auth`, `/api/tickets`, `/api/solutions`, `/api/ai`, `/api/users`, `/api/upload` ([src/composition/index.js](../src/composition/index.js#L204)).
- Auth routes: [src/routes/authRoutes.js](../src/routes/authRoutes.js#L6).
- Ticket routes: [src/routes/ticketRoutes.js](../src/routes/ticketRoutes.js#L9).
- AI routes: [src/routes/aiRoutes.js](../src/routes/aiRoutes.js#L161).
- DTO schemas (zod): [src/validation/schemas.js](../src/validation/schemas.js#L39).
- OpenAPI spec: [docs/openapi.json](./openapi.json#L14).

## 5. Data and database
- MongoDB via Mongoose connect: [src/composition/index.js](../src/composition/index.js#L253).
- Models: [src/models/userModel.js](../src/models/userModel.js#L89), [src/models/ticketModel.js](../src/models/ticketModel.js#L96), [src/models/solutionModel.js](../src/models/solutionModel.js#L72), [src/models/refreshTokenModel.js](../src/models/refreshTokenModel.js#L41), [src/models/aiLogs.js](../src/models/aiLogs.js#L8).
- TTL indexes: refresh token expiry and 30-day AI log retention ([src/models/refreshTokenModel.js](../src/models/refreshTokenModel.js#L35), [src/models/aiLogs.js](../src/models/aiLogs.js#L4)).

## 6. Background tasks and integrations
- Periodic `markInactiveUsersOffline` task every 5 minutes ([src/composition/index.js](../src/composition/index.js#L262), [src/controllers/userStatusController.js](../src/controllers/userStatusController.js#L22)).
- AI conversation cleanup interval in `aiRoutes` ([src/routes/aiRoutes.js](../src/routes/aiRoutes.js#L153)).
- Redis integration: [src/config/redis.js](../src/config/redis.js#L10).
- OpenAI adapter: [src/infrastructure/ai/OpenAILLMAdapter.js](../src/infrastructure/ai/OpenAILLMAdapter.js#L1).
- Cloudinary config/storage: [src/config/cloudinary.js](../src/config/cloudinary.js#L1), [src/infrastructure/storage/CloudinaryFileStorage.js](../src/infrastructure/storage/CloudinaryFileStorage.js#L18).

## 7. Config and environment
- Centralized env parsing/validation with zod and `dotenv.config()`: [src/config/env.js](../src/config/env.js#L1).
- Key env variables are defined in schema (`NODE_ENV`, `PORT`, `MONGO_URI`, `JWT_*`, `CORS_ORIGIN`, `OPENAI_API_KEY`, `REDIS_URL`, `CLOUDINARY_*`, `AUTH_COOKIE_*`): [src/config/env.js](../src/config/env.js#L8).
- CORS allowlist + credentials: [src/config/cors.js](../src/config/cors.js#L3).

## 8. Auth and security
- HTTP hardening: `helmet`, CSP, `x-powered-by` disabled, rate limits on `/api/auth` and `/api/ai` ([src/composition/index.js](../src/composition/index.js#L176), [src/composition/index.js](../src/composition/index.js#L49), [src/composition/index.js](../src/composition/index.js#L206)).
- Auth middleware reads access token from cookie and/or Bearer header: [src/middlewares/authMiddleware.js](../src/middlewares/authMiddleware.js#L7).
- JWT access/refresh + refresh rotation/revoke (hashed token): [src/infrastructure/security/JwtTokenProvider.js](../src/infrastructure/security/JwtTokenProvider.js#L5), [src/application/auth/use-cases/refresh.js](../src/application/auth/use-cases/refresh.js#L48), [src/infrastructure/persistence/mongoose/MongooseRefreshTokenRepository.js](../src/infrastructure/persistence/mongoose/MongooseRefreshTokenRepository.js#L22).
- RBAC/ownership middleware: [src/middlewares/roleMiddleware.js](../src/middlewares/roleMiddleware.js#L1), [src/middlewares/ticketOwnershipMiddleware.js](../src/middlewares/ticketOwnershipMiddleware.js#L3).

## 9. Tests
- Jest config: [jest.config.js](../jest.config.js#L3).
- Test setup with `MongoMemoryServer`: [tests/setup.js](../tests/setup.js#L53).
- Integration tests: [tests/auth.test.js](../tests/auth.test.js#L7), [tests/tickets.test.js](../tests/tickets.test.js#L48), [tests/basic.test.js](../tests/basic.test.js#L21).
- Contract/unit tests: [tests/unit/authRoutesContract.test.js](../tests/unit/authRoutesContract.test.js#L66), [tests/unit/ticketRoutesContract.test.js](../tests/unit/ticketRoutesContract.test.js#L67), [tests/unit/aiRoutesContract.test.js](../tests/unit/aiRoutesContract.test.js#L62).
