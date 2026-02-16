import mongoose from "mongoose";
import { AppError } from "./AppError.js";

const invalidCursorError = () =>
  new AppError("Invalid cursor", {
    statusCode: 400,
    code: "INVALID_CURSOR",
  });

export const encodeCursor = ({ createdAt, id }) => {
  const payload = { createdAt, id };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
};

export const decodeCursor = cursor => {
  if (!cursor) return null;

  let payload;
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    payload = JSON.parse(raw);
  } catch {
    throw invalidCursorError();
  }

  if (!payload || typeof payload !== "object") {
    throw invalidCursorError();
  }

  const { createdAt, id } = payload;
  if (!createdAt || !id) {
    throw invalidCursorError();
  }

  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    throw invalidCursorError();
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw invalidCursorError();
  }

  return {
    createdAt: parsedDate,
    _id: id,
  };
};
