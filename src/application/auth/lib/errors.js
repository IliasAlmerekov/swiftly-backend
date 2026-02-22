import { AppError } from "../../../utils/AppError.js";

const createHttpError = ({ message, statusCode, code }) => {
  const error = new AppError(message, { statusCode, code });

  // Compatibility for legacy tests checking `error.status`.
  error.status = statusCode;

  return error;
};

export const authRequiredError = (message = "Not authorized") =>
  createHttpError({
    message,
    statusCode: 401,
    code: "AUTH_REQUIRED",
  });

export const authInvalidError = (message = "Not authorized") =>
  createHttpError({
    message,
    statusCode: 401,
    code: "AUTH_INVALID",
  });

export const authInvalidRefreshError = (message = "Invalid refresh token") =>
  createHttpError({
    message,
    statusCode: 401,
    code: "AUTH_INVALID_REFRESH",
  });

export const authRefreshRevokedError = (
  message = "Refresh token revoked or expired"
) =>
  createHttpError({
    message,
    statusCode: 401,
    code: "AUTH_REFRESH_REVOKED",
  });

export const badRequestError = (
  message = "Bad request",
  code = "BAD_REQUEST"
) =>
  createHttpError({
    message,
    statusCode: 400,
    code,
  });
