// This file creates a simple version of our app for testing
// It's like our main server.js but without starting the actual server

import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import authRoutes from "../src/routes/authRoutes.js";
import ticketRoutes from "../src/routes/ticketRoutes.js";
import { errorHandler } from "../src/middlewares/errorHandler.js";
import { notFound } from "../src/middlewares/notFound.js";
import { requestLogger } from "../src/middlewares/requestLogger.js";
import { config } from "../src/config/env.js";
import { openApiSpec } from "../src/utils/openapi.js";
import helmet from "helmet";

// Create the Express app
const app = express();

const baseHelmet = helmet({
  contentSecurityPolicy: false,
  hsts: config.isProduction
    ? { maxAge: 15552000, includeSubDomains: true, preload: true }
    : false
});
const apiCsp = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'none'"],
    baseUri: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'none'"]
  }
});

// Set up middleware (the things that process requests)
app.use(requestLogger);
app.use(baseHelmet);
app.use((req, res, next) => {
  if (req.path.startsWith("/api/docs")) return next();
  return apiCsp(req, res, next);
});
app.use(cors());
app.use(express.json({ limit: config.requestBodyLimit })); // This lets us read JSON data from requests

// Set up our routes (the different URLs our app responds to)
app.use("/api/auth", authRoutes);      // Routes for login/register
app.use("/api/tickets", ticketRoutes); // Routes for tickets

// Simple test route
app.get("/", (req, res) => {
  res.send("API live");
});

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    service: "ScooTeq Helpdesk Backend"
  });
});

app.get("/__test/error", (req, res, next) => {
  next(new Error("Test error"));
});

app.get("/api/docs.json", (req, res) => {
  res.json(openApiSpec);
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use(notFound);
app.use(errorHandler);

// Export the app so tests can use it
export default app;
