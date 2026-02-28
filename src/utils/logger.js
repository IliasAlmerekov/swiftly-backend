import pino from "pino";
import { config } from "../config/env.js";

export const loggerOptions = Object.freeze({
  level: config.logLevel,
  base: null,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers.x-csrf-token",
    ],
    remove: true,
  },
});

const logger = pino(loggerOptions);

export default logger;
