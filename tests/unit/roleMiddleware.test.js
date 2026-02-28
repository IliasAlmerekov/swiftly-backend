import {
  requireRole,
  requireRoleOrSelf,
} from "../../src/middlewares/roleMiddleware.js";
import { jest } from "@jest/globals";
import { AppError } from "../../src/utils/AppError.js";

describe("roleMiddleware", () => {
  test("requireRole denies missing user via next(AppError)", () => {
    const req = { user: null };
    const next = jest.fn();

    requireRole(["admin"])(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });

  test("requireRole denies wrong role via next(AppError)", () => {
    const req = { user: { role: "user" } };
    const next = jest.fn();

    requireRole(["admin"])(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
  });

  test("requireRole allows matching role", () => {
    const req = { user: { role: "admin" } };
    const next = jest.fn();

    requireRole(["admin"])(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  test("requireRoleOrSelf allows self access", () => {
    const req = { user: { role: "user", _id: "u1" }, params: { userId: "u1" } };
    const next = jest.fn();

    requireRoleOrSelf(["admin"])(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  test("requireRoleOrSelf denies other user via next(AppError)", () => {
    const req = { user: { role: "user", _id: "u1" }, params: { userId: "u2" } };
    const next = jest.fn();

    requireRoleOrSelf(["admin"])(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });

  test("requireRoleOrSelf denies missing user via next(AppError)", () => {
    const req = { user: null };
    const next = jest.fn();

    requireRoleOrSelf(["admin"])(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
  });
});
