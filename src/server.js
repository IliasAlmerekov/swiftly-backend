import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import process from "process";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import authRoutes from "./routes/authRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import solutionRoutes from "./routes/solutionRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import { markInactiveUsersOffline } from "./controllers/userStatusController.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import { config } from "./config/env.js";
import logger from "./utils/logger.js";
import { openApiSpec } from "./utils/openapi.js";

const app = express();
const allowedOrigins = (config.corsOrigin || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length > 0) {
      return callback(null, allowedOrigins.includes(origin));
    }
    if (!config.isProduction) {
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(
        origin
      );
      return callback(null, isLocalhost);
    }
    return callback(new Error("Not allowed by CORS"));
  },
};

app.disable("x-powered-by");
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
app.use(cors(corsOptions));
app.use(express.json({ limit: config.requestBodyLimit }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

// Authentifizierungs-Routen
app.use("/api/auth", authLimiter, authRoutes);

// Ticket-Routen
app.use("/api/tickets", ticketRoutes);

// Solution-Routen
app.use("/api/solutions", solutionRoutes);

// AI-Routen
app.use("/api/ai", aiLimiter, aiRoutes);

// User-Routen
app.use("/api/users", userRoutes);

// Upload-Routen
app.use("/api/upload", uploadRoutes);

app.get("/", (req, res) => {
  res.send("API live");
});

// Health check endpoint for Render
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Swiftly Helpdesk Backend",
  });
});

app.get("/api/docs.json", (req, res) => {
  res.json(openApiSpec);
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use(notFound);
app.use(errorHandler);

let server;
let cleanupInterval;
let shuttingDown = false;

const shutdown = async (signal, error) => {
  if (shuttingDown) return;
  shuttingDown = true;

  if (error) {
    logger.error({ err: error }, "Shutdown due to error");
  }
  logger.info({ signal }, "Shutting down");

  if (cleanupInterval) clearInterval(cleanupInterval);

  const forceExit = setTimeout(() => {
    logger.error("Forcing shutdown after timeout");
    process.exit(1);
  }, 10000);

  try {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    await mongoose.connection.close(false);
  } catch (closeError) {
    logger.error({ err: closeError }, "Error during shutdown");
  } finally {
    clearTimeout(forceExit);
    process.exit(error ? 1 : 0);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", err => shutdown("unhandledRejection", err));
process.on("uncaughtException", err => shutdown("uncaughtException", err));

mongoose
  .connect(config.mongoUri)
  .then(() => {
    server = app.listen(config.port, "0.0.0.0", () => {
      logger.info({ port: config.port }, "Swiftly Helpdesk Server started");
      logger.info({ env: config.nodeEnv }, "Environment");

      // Start cleanup job for inactive users (every 5 minutes)
      cleanupInterval = setInterval(markInactiveUsersOffline, 5 * 60 * 1000);
    });
  })
  .catch(err => {
    logger.error({ err }, "Database connection error");
    shutdown("startup", err);
  });
