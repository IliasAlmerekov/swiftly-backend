import { jest } from "@jest/globals";
import {
  createErrorHandler,
  errorHandler,
} from "../../src/middlewares/errorHandler.js";
import { AppError } from "../../src/utils/AppError.js";

/* ---------- helpers ---------- */

const makeReq = (overrides = {}) => ({
  id: "req-1",
  path: "/test",
  ...overrides,
});

const makeRes = () => {
  const res = {
    headersSent: false,
    _status: null,
    _body: null,
    status(code) {
      res._status = code;
      return res;
    },
    json(body) {
      res._body = body;
      return res;
    },
  };
  return res;
};

/* ---------- tests ---------- */

describe("errorHandler", () => {
  describe("operational AppError", () => {
    it("should return the error's status, code and message", () => {
      const err = new AppError("Not found", {
        statusCode: 404,
        code: "NOT_FOUND",
      });
      const req = makeReq();
      const res = makeRes();
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res._status).toBe(404);
      expect(res._body.code).toBe("NOT_FOUND");
      expect(res._body.message).toBe("Not found");
      expect(next).not.toHaveBeenCalled();
    });

    it("should include details when present", () => {
      const err = new AppError("Validation", {
        statusCode: 422,
        code: "VALIDATION",
        details: [{ field: "email" }],
      });
      const res = makeRes();

      errorHandler(err, makeReq(), res, jest.fn());

      expect(res._body.details).toEqual([{ field: "email" }]);
    });
  });

  describe("non-operational (catastrophic) AppError", () => {
    it("should respond with generic message and trigger onCatastrophic", () => {
      const onCatastrophic = jest.fn();
      const handler = createErrorHandler({ onCatastrophic });
      const err = new AppError("DB driver broke", {
        statusCode: 500,
        code: "DB_FAIL",
        isOperational: false,
      });
      const res = makeRes();

      handler(err, makeReq(), res, jest.fn());

      expect(res._status).toBe(500);
      expect(res._body.message).toBe("Internal Server Error");
      expect(res._body.details).toBeUndefined();
      // onCatastrophic is scheduled via setImmediate
      expect(onCatastrophic).not.toHaveBeenCalled();

      return new Promise(resolve => {
        setImmediate(() => {
          expect(onCatastrophic).toHaveBeenCalledWith(err);
          resolve();
        });
      });
    });
  });

  describe("unknown (non-AppError) errors", () => {
    it("should respond 500 with generic message", () => {
      const res = makeRes();

      errorHandler(new TypeError("oops"), makeReq(), res, jest.fn());

      expect(res._status).toBe(500);
      expect(res._body.code).toBe("INTERNAL_ERROR");
      expect(res._body.message).toBe("Internal Server Error");
    });

    it("should trigger onCatastrophic for unknown errors", () => {
      const onCatastrophic = jest.fn();
      const handler = createErrorHandler({ onCatastrophic });
      const err = new RangeError("boom");
      const res = makeRes();

      handler(err, makeReq(), res, jest.fn());

      return new Promise(resolve => {
        setImmediate(() => {
          expect(onCatastrophic).toHaveBeenCalledWith(err);
          resolve();
        });
      });
    });
  });

  describe("headersSent guard", () => {
    it("should delegate to next when headers already sent", () => {
      const res = makeRes();
      res.headersSent = true;
      const next = jest.fn();
      const err = new Error("late");

      errorHandler(err, makeReq(), res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(res._status).toBeNull();
    });
  });

  describe("backwards-compatible static export", () => {
    it("should work without onCatastrophic (no crash on non-operational)", () => {
      const err = new AppError("bad", { isOperational: false });
      const res = makeRes();

      // no throw expected
      errorHandler(err, makeReq(), res, jest.fn());

      expect(res._status).toBe(500);
    });
  });
});
