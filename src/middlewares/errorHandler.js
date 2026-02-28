import { isAppError } from "../utils/AppError.js";
import logger from "../utils/logger.js";
import { config } from "../config/env.js";

/**
 * Creates the centralized Express error handler.
 *
 * @param {object}   [options]
 * @param {function} [options.onCatastrophic] – called with the error when a
 *   non-operational (programmer) error is detected.  Typically wired to the
 *   bootstrap `shutdown` function so the process exits gracefully.
 */
export const createErrorHandler = ({ onCatastrophic } = {}) => {
  return (err, req, res, next) => {
    /* If headers were already flushed, delegate to Express default handler
       which will close the connection properly. */
    if (res.headersSent) {
      return next(err);
    }

    const isKnown = isAppError(err);
    const isOperational = isKnown && err.isOperational !== false;
    const status = isKnown ? err.statusCode : 500;
    const code = isKnown ? err.code : "INTERNAL_ERROR";
    const message = isOperational ? err.message : "Internal Server Error";

    const payload = { message, code };

    if (isOperational && err.details) payload.details = err.details;
    if (config.nodeEnv === "development") {
      payload.stack = err.stack;
    }

    if (status >= 500 || !isOperational) {
      logger.error({ err, reqId: req.id, path: req.path }, "Request failed");
    } else {
      logger.warn({ err, reqId: req.id, path: req.path }, "Request error");
    }

    res.status(status).json(payload);

    /* Catastrophic (non-operational) errors — schedule a graceful shutdown
       *after* the response has been sent so the current request still gets
       a proper HTTP reply. */
    if (!isOperational && typeof onCatastrophic === "function") {
      setImmediate(() => onCatastrophic(err));
    }
  };
};

/** Backwards-compatible static handler (no shutdown wiring). */
export const errorHandler = createErrorHandler();
