import { jest } from "@jest/globals";
import { createAuthMiddleware } from "../../src/middlewares/authMiddleware.js";

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe("authMiddleware", () => {
  test("passes extracted user context to req.user", async () => {
    const authService = {
      resolveAuthContext: jest
        .fn()
        .mockResolvedValue({ _id: "u1", role: "user" }),
    };
    const middleware = createAuthMiddleware({ authService });
    const req = {
      headers: {
        authorization: "Bearer access-token",
        cookie: "__Host-swiftly_helpdesk_at=cookie-access-token",
      },
    };
    const res = createRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(authService.resolveAuthContext).toHaveBeenCalledWith({
      authorizationHeader: "Bearer access-token",
      accessToken: "cookie-access-token",
    });
    expect(req.user).toEqual({ _id: "u1", role: "user" });
    expect(next).toHaveBeenCalledWith();
  });

  test("forwards auth errors from auth use-case", async () => {
    const error = Object.assign(new Error("Not authorized"), {
      statusCode: 401,
      code: "AUTH_INVALID",
    });
    const authService = {
      resolveAuthContext: jest.fn().mockRejectedValue(error),
    };
    const middleware = createAuthMiddleware({ authService });
    const req = { headers: { authorization: "Bearer bad-token" } };
    const res = createRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
