import pino from "pino";
import { config } from "../config/env.js";

const logger = pino({
  level: config.logLevel,
  base: null,
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    remove: true,
  },
});

export default logger;
