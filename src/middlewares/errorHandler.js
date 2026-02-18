import { isAppError } from "../utils/AppError.js";
import logger from "../utils/logger.js";
import { config } from "../config/env.js";

export const errorHandler = (err, req, res, _next) => {
  const isKnown = isAppError(err);
  const status = isKnown ? err.statusCode : 500;
  const code = isKnown ? err.code : "INTERNAL_ERROR";
  const message = isKnown ? err.message : "Internal Server Error";

  const payload = { message, code };

  if (isKnown && err.details) payload.details = err.details;
  if (config.nodeEnv === "development") {
    payload.stack = err.stack;
  }

  if (status >= 500) {
    logger.error({ err, reqId: req.id, path: req.path }, "Request failed");
  } else {
    logger.warn({ err, reqId: req.id, path: req.path }, "Request error");
  }

  res.status(status).json(payload);
};
