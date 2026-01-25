import { ZodError } from "zod";

const normalizeMessage = issues => {
  if (!issues || issues.length === 0) return "Validation error";
  return issues[0].message || "Validation error";
};

export const validateDto = (schema, payload) => {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      const err = new Error(normalizeMessage(error.issues));
      err.status = 400;
      err.details = error.issues;
      throw err;
    }
    throw error;
  }
};
