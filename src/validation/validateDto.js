import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";

const normalizeMessage = issues => {
  if (!issues || issues.length === 0) return "Validation error";
  return issues[0].message || "Validation error";
};

export const validateDto = (schema, payload) => {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      const err = new AppError(normalizeMessage(error.issues), {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        details: error.issues,
      });
      throw err;
    }
    throw error;
  }
};
