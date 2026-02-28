import { randomBytes, timingSafeEqual } from "node:crypto";
import { csrfConfig } from "../config/csrf.js";
import { AppError } from "../utils/AppError.js";
import { getCookieValue } from "../utils/cookies.js";

const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

const issueCsrfToken = () =>
  randomBytes(csrfConfig.tokenBytes).toString("base64url");

const normalizeToken = value =>
  typeof value === "string" ? value.trim() : undefined;

const isTokenMatch = (headerToken, cookieToken) => {
  const headerBuffer = Buffer.from(headerToken);
  const cookieBuffer = Buffer.from(cookieToken);

  if (headerBuffer.length !== cookieBuffer.length) {
    return false;
  }

  return timingSafeEqual(headerBuffer, cookieBuffer);
};

const csrfInvalidError = (detailsCode = "mismatch") =>
  new AppError("Invalid CSRF token", {
    statusCode: 403,
    code: "CSRF_INVALID",
    details: { reason: detailsCode },
  });

export const createCsrfProtectionMiddleware = () => (req, res, next) => {
  const cookieToken = normalizeToken(
    getCookieValue(req.headers.cookie, csrfConfig.cookieName)
  );
  let effectiveToken = cookieToken;

  if (safeMethods.has(req.method) && !cookieToken) {
    effectiveToken = issueCsrfToken();
    res.cookie(csrfConfig.cookieName, effectiveToken, csrfConfig.cookieOptions);
  }

  if (effectiveToken) {
    res.locals.csrfToken = effectiveToken;
  }

  if (!stateChangingMethods.has(req.method)) {
    return next();
  }

  const headerToken = normalizeToken(req.get(csrfConfig.headerName));

  if (!cookieToken || !headerToken) {
    return next(csrfInvalidError("missing"));
  }

  if (!isTokenMatch(headerToken, cookieToken)) {
    return next(csrfInvalidError("mismatch"));
  }

  return next();
};
