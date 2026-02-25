import { config } from "./env.js";

const normalizeSameSite = value => {
  if (typeof value !== "string") {
    return config.isProduction ? "none" : "lax";
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === "strict" ||
    normalized === "lax" ||
    normalized === "none"
  ) {
    return normalized;
  }

  return config.isProduction ? "none" : "lax";
};

const secureByDefault = config.isProduction;
const sameSite = normalizeSameSite(process.env.AUTH_COOKIE_SAMESITE);
const domain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;

const accessCookieName =
  process.env.AUTH_ACCESS_COOKIE_NAME?.trim() || "__Host-swiftly_helpdesk_at";
const refreshCookieName =
  process.env.AUTH_REFRESH_COOKIE_NAME?.trim() || "__Host-swiftly_helpdesk_rt";

const baseCookieOptions = {
  httpOnly: true,
  secure:
    process.env.AUTH_COOKIE_SECURE?.trim() === "false"
      ? false
      : process.env.AUTH_COOKIE_SECURE?.trim() === "true"
        ? true
        : secureByDefault,
  sameSite,
  path: "/",
};

if (domain) {
  baseCookieOptions.domain = domain;
}

export const authCookieNames = {
  accessToken: accessCookieName,
  refreshToken: refreshCookieName,
};

export const getAuthCookieOptions = expiresAt => {
  const options = { ...baseCookieOptions };
  if (expiresAt instanceof Date) {
    options.expires = expiresAt;
  }
  return options;
};

export const getClearingCookieOptions = () => ({
  ...baseCookieOptions,
  expires: new Date(0),
});
