import { config } from "./env.js";

const REQUIRED_ALLOWED_ORIGINS = ["https://swiftly-helpdesk.netlify.app"];

const configuredOrigins = (config.corsOrigin || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...REQUIRED_ALLOWED_ORIGINS,
  ...configuredOrigins,
]);

const isLocalhostOrigin = origin =>
  /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

export const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    if (!config.isProduction && isLocalhostOrigin(origin)) {
      return callback(null, true);
    }

    if (allowedOrigins.size > 0) {
      return callback(null, false);
    }

    if (!config.isProduction) {
      return callback(null, false);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  optionsSuccessStatus: 204,
};
