export class AppError extends Error {
  constructor(
    message,
    { statusCode = 500, code = "INTERNAL_ERROR", isOperational = true, details } = {}
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
  }
}

export const isAppError = error => error instanceof AppError;

