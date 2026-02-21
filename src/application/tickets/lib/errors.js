import { AppError } from "../../../utils/AppError.js";

const createHttpError = ({ message, statusCode, code }) => {
  const error = new AppError(message, { statusCode, code });

  // Compatibility bridge for legacy code/tests that still read `error.status`.
  error.status = statusCode;

  return error;
};

export const forbiddenError = (message = "Access denied") =>
  createHttpError({
    message,
    statusCode: 403,
    code: "ACCESS_DENIED",
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

export const notFoundError = (message = "Not found", code = "NOT_FOUND") =>
  createHttpError({
    message,
    statusCode: 404,
    code,
  });
