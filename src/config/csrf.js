import { config } from "./env.js";

const resolveDefaultCsrfCookieName = nodeEnv => {
  if (nodeEnv === "development") {
    return "swiftly_helpdesk_csrf";
  }

  return "__Host-swiftly_helpdesk_csrf";
};

const resolveSameSite = value => {
  // Cross-site SPA support in production requires SameSite=None and Secure=true.
  if (config.isProduction) {
    return "none";
  }

  if (typeof value !== "string") {
    return "lax";
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === "strict" ||
    normalized === "lax" ||
    normalized === "none"
  ) {
    return normalized;
  }

  return "lax";
};

const cookieName = resolveDefaultCsrfCookieName(config.nodeEnv);

export const csrfConfig = Object.freeze({
  headerName: "X-CSRF-Token",
  cookieName,
  tokenBytes: 32,
  cookieOptions: Object.freeze({
    httpOnly: false,
    secure: config.isProduction ? true : false,
    sameSite: resolveSameSite(config.authCookieSameSite),
    path: "/",
  }),
});
