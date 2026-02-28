import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";

import cloudinary from "../config/cloudinary.js";
import { getAuthEndpointPolicy } from "../config/authEndpointPolicy.js";
import { config } from "../config/env.js";
import { corsOptions } from "../config/cors.js";
import { getRedisClient, isRedisEnabled } from "../config/redis.js";
import { createAIController } from "../controllers/aiController.js";
import { createAuthController } from "../controllers/authController.js";
import { createCloudUploadController } from "../controllers/cloudUpload.js";
import { createSolutionController } from "../controllers/solutionController.js";
import { createTicketController } from "../controllers/ticketController.js";
import { createUserController } from "../controllers/getUser.js";
import { createUserStatusController } from "../controllers/userStatusController.js";
import MongooseRefreshTokenRepository from "../infrastructure/persistence/mongoose/MongooseRefreshTokenRepository.js";
import MongooseTicketRepository from "../infrastructure/persistence/mongoose/MongooseTicketRepository.js";
import MongooseUserRepository from "../infrastructure/persistence/mongoose/MongooseUserRepository.js";
import BcryptPasswordHasher from "../infrastructure/security/BcryptPasswordHasher.js";
import JwtTokenProvider from "../infrastructure/security/JwtTokenProvider.js";
import CloudinaryFileStorage from "../infrastructure/storage/CloudinaryFileStorage.js";
import { createAuthMiddleware } from "../middlewares/authMiddleware.js";
import { createCsrfProtectionMiddleware } from "../middlewares/csrfMiddleware.js";
import {
  createErrorHandler,
  errorHandler,
} from "../middlewares/errorHandler.js";
import { notFound } from "../middlewares/notFound.js";
import { requestLogger } from "../middlewares/requestLogger.js";
import AIRequestLog from "../models/aiLogs.js";
import RefreshToken from "../models/refreshTokenModel.js";
import Solution from "../models/solutionModel.js";
import Ticket from "../models/ticketModel.js";
import User from "../models/userModel.js";
import SolutionRepository from "../repositories/solutionRepository.js";
import { createAIRoutes } from "../routes/aiRoutes.js";
import { createAuthRoutes } from "../routes/authRoutes.js";
import { createSolutionRoutes } from "../routes/solutionRoutes.js";
import { createTicketRoutes } from "../routes/ticketRoutes.js";
import { createUploadRoutes } from "../routes/uploadRoutes.js";
import { createUserRoutes } from "../routes/userRoutes.js";
import AuthService from "../services/authService.js";
import SolutionService from "../services/solutionService.js";
import TicketService from "../services/ticketService.js";
import UserService from "../services/userService.js";
import { openApiSpec } from "../utils/openapi.js";
import logger from "../utils/logger.js";
import { createAIService } from "./aiService.js";

const createRateLimiters = () => ({
  authLimiter: rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
  aiLimiter: rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
  apiLimiter: rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
  uploadLimiter: rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
});

export const createContainer = () => {
  const ticketRepository = new MongooseTicketRepository({ Ticket });
  const userRepository = new MongooseUserRepository({ User });
  const refreshTokenRepository = new MongooseRefreshTokenRepository({
    RefreshToken,
  });
  const solutionRepository = new SolutionRepository({ Solution });
  const fileStorage = new CloudinaryFileStorage({ cloudinary });
  const passwordHasher = new BcryptPasswordHasher();
  const tokenProvider = new JwtTokenProvider();

  const ticketService = new TicketService({
    ticketRepository,
    userRepository,
    fileStorage,
  });
  const authService = new AuthService({
    userRepo: userRepository,
    refreshTokenRepo: refreshTokenRepository,
    passwordHasher,
    tokenProvider,
  });
  const userService = new UserService({ userRepository });
  const solutionService = new SolutionService({ solutionRepository });
  const aiService = createAIService({
    apiKey: config.openaiApiKey,
    aiRequestLogModel: AIRequestLog,
    solutionModel: Solution,
    logger,
  });

  const authController = createAuthController({
    authService,
    resolveAuthEndpointPolicy: getAuthEndpointPolicy,
  });
  const ticketController = createTicketController({ ticketService });
  const solutionController = createSolutionController({ solutionService });
  const userController = createUserController({ userService });
  const aiController = createAIController({ aiRequestLogModel: AIRequestLog });
  const userStatusController = createUserStatusController({
    userService,
    logger,
  });
  const cloudUploadController = createCloudUploadController({
    userService,
    fileStorage,
  });

  const authMiddleware = createAuthMiddleware({ authService });
  const csrfProtectionMiddleware = createCsrfProtectionMiddleware();

  const routes = {
    authRoutes: createAuthRoutes({ authController, authMiddleware }),
    ticketRoutes: createTicketRoutes({ ticketController, authMiddleware }),
    solutionRoutes: createSolutionRoutes({
      solutionController,
      authMiddleware,
    }),
    aiRoutes: createAIRoutes({
      aiService,
      authMiddleware,
      getAIRequestsStats: aiController.getAIRequestsStats,
      logger,
      isRedisEnabled,
      getRedisClient,
      conversationTtlMs: Number(config.aiConversationTtlMs) || 30 * 60 * 1000,
    }),
    userRoutes: createUserRoutes({
      userController,
      userStatusController,
      authMiddleware,
    }),
    uploadRoutes: createUploadRoutes({ cloudUploadController, authMiddleware }),
  };

  return {
    services: {
      authService,
      ticketService,
      userService,
      solutionService,
      aiService,
    },
    controllers: {
      authController,
      ticketController,
      solutionController,
      userController,
      aiController,
      userStatusController,
      cloudUploadController,
    },
    middlewares: {
      authMiddleware,
      csrfProtectionMiddleware,
    },
    routes,
  };
};

let defaultContainer = null;

export const getDefaultContainer = () => {
  if (!defaultContainer) {
    defaultContainer = createContainer();
  }
  return defaultContainer;
};

export const createApp = ({
  container = getDefaultContainer(),
  registerBeforeErrorHandlers,
  disableRateLimiting = false,
  onCatastrophic,
} = {}) => {
  const app = express();
  const { authLimiter, aiLimiter, apiLimiter, uploadLimiter } =
    createRateLimiters();

  app.disable("x-powered-by");
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(requestLogger);

  const baseHelmet = helmet({
    contentSecurityPolicy: false,
    hsts: config.isProduction
      ? { maxAge: 15552000, includeSubDomains: true, preload: true }
      : false,
  });
  const apiCsp = helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'none'"],
    },
  });

  app.use(baseHelmet);
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/docs")) return next();
    return apiCsp(req, res, next);
  });
  app.use(express.json({ limit: config.requestBodyLimit }));
  app.use("/api", container.middlewares.csrfProtectionMiddleware);

  if (disableRateLimiting) {
    app.use("/api/auth", container.routes.authRoutes);
    app.use("/api/tickets", container.routes.ticketRoutes);
    app.use("/api/solutions", container.routes.solutionRoutes);
    app.use("/api/ai", container.routes.aiRoutes);
    app.use("/api/users", container.routes.userRoutes);
    app.use("/api/upload", container.routes.uploadRoutes);
  } else {
    app.use("/api/auth", authLimiter, container.routes.authRoutes);
    app.use("/api/tickets", apiLimiter, container.routes.ticketRoutes);
    app.use("/api/solutions", apiLimiter, container.routes.solutionRoutes);
    app.use("/api/ai", aiLimiter, container.routes.aiRoutes);
    app.use("/api/users", apiLimiter, container.routes.userRoutes);
    app.use("/api/upload", uploadLimiter, container.routes.uploadRoutes);
  }

  app.get("/", (_req, res) => {
    res.send("API live");
  });

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "OK",
      timestamp: new Date().toISOString(),
      service: "Swiftly Helpdesk Backend",
    });
  });

  app.get("/api/docs.json", (_req, res) => {
    res.json(openApiSpec);
  });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

  if (typeof registerBeforeErrorHandlers === "function") {
    registerBeforeErrorHandlers(app);
  }

  app.use(notFound);
  app.use(
    onCatastrophic ? createErrorHandler({ onCatastrophic }) : errorHandler
  );

  return app;
};

export const createBootstrap = ({ container = getDefaultContainer() } = {}) => {
  let server;
  let cleanupInterval;
  let shuttingDown = false;

  /* Forward reference – the error handler can trigger shutdown for
     catastrophic (non-operational) errors while still sending a response. */
  const onCatastrophic = err => {
    shutdown("catastrophic", err).then(code => process.exit(code));
  };

  const app = createApp({ container, onCatastrophic });

  const start = async () => {
    await mongoose.connect(config.mongoUri);

    await new Promise(resolve => {
      server = app.listen(config.port, "0.0.0.0", resolve);
    });

    logger.info({ port: config.port }, "Swiftly Helpdesk Server started");
    logger.info({ env: config.nodeEnv }, "Environment");

    cleanupInterval = setInterval(
      container.controllers.userStatusController.markInactiveUsersOffline,
      5 * 60 * 1000
    );
    if (typeof cleanupInterval.unref === "function") {
      cleanupInterval.unref();
    }

    return server;
  };

  const SHUTDOWN_TIMEOUT_MS = 10_000;

  const shutdown = async (signal, error) => {
    if (shuttingDown) {
      return error ? 1 : 0;
    }
    shuttingDown = true;

    if (error) {
      logger.error({ err: error }, "Shutdown due to error");
    }
    logger.info({ signal }, "Shutting down");

    /* Hard deadline — force exit if graceful close hangs */
    const forceTimer = setTimeout(() => {
      logger.error("Shutdown timed out, forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    if (typeof forceTimer.unref === "function") forceTimer.unref();

    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }

    try {
      if (server) {
        await new Promise(resolve => server.close(resolve));
        server = null;
      }

      if (mongoose.connection.readyState > 0) {
        await mongoose.connection.close(false);
      }
    } catch (closeError) {
      logger.error({ err: closeError }, "Error during shutdown");
      return 1;
    }

    return error ? 1 : 0;
  };

  const registerProcessHandlers = () => {
    process.on("SIGTERM", () => {
      shutdown("SIGTERM").then(code => process.exit(code));
    });
    process.on("SIGINT", () => {
      shutdown("SIGINT").then(code => process.exit(code));
    });
    process.on("unhandledRejection", error => {
      shutdown("unhandledRejection", error).then(code => process.exit(code));
    });
    process.on("uncaughtException", error => {
      shutdown("uncaughtException", error).then(code => process.exit(code));
    });
  };

  return {
    app,
    container,
    start,
    shutdown,
    registerProcessHandlers,
  };
};
