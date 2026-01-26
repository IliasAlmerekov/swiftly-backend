import { AppError } from "../utils/AppError.js";

export const notFound = (req, _res, next) => {
  next(
    new AppError("Route not found", {
      statusCode: 404,
      code: "NOT_FOUND"
    })
  );
};

