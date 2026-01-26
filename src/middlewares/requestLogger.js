import { randomUUID } from "crypto";
import pinoHttp from "pino-http";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";

const genReqId = (req, res) => {
  const existing = req.headers["x-request-id"];
  if (existing) return existing;
  const id = randomUUID();
  res.setHeader("x-request-id", id);
  return id;
};

export const requestLogger = pinoHttp({
  logger,
  genReqId,
  autoLogging: !config.isTest
});

