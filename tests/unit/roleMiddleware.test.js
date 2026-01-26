import { requireRole, requireRoleOrSelf } from "../../src/middlewares/roleMiddleware.js";
import { jest } from "@jest/globals";

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn()
});

describe("roleMiddleware", () => {
  test("requireRole denies missing user", () => {
    const req = { user: null };
    const res = createRes();
    const next = jest.fn();

    requireRole(["admin"])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Access denied" });
  });

  test("requireRole allows matching role", () => {
    const req = { user: { role: "admin" } };
    const res = createRes();
    const next = jest.fn();

    requireRole(["admin"])(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test("requireRoleOrSelf allows self access", () => {
    const req = { user: { role: "user", _id: "u1" }, params: { userId: "u1" } };
    const res = createRes();
    const next = jest.fn();

    requireRoleOrSelf(["admin"])(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test("requireRoleOrSelf denies other user", () => {
    const req = { user: { role: "user", _id: "u1" }, params: { userId: "u2" } };
    const res = createRes();
    const next = jest.fn();

    requireRoleOrSelf(["admin"])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Access denied" });
  });
});
