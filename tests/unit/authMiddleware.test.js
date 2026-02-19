import { jest } from "@jest/globals";

const mockVerifyAccessToken = jest.fn();
const mockFindById = jest.fn();

jest.unstable_mockModule("../../src/services/tokenService.js", () => ({
  verifyAccessToken: mockVerifyAccessToken,
}));

jest.unstable_mockModule("../../src/models/userModel.js", () => ({
  default: { findById: mockFindById },
}));

const { default: authMiddleware } = await import(
  "../../src/middlewares/authMiddleware.js"
);

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe("authMiddleware", () => {
  beforeEach(() => {
    mockVerifyAccessToken.mockReset();
    mockFindById.mockReset();
  });

  test("rejects missing auth header", async () => {
    const req = { headers: {} };
    const res = createRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("AUTH_REQUIRED");
  });

  test("rejects invalid token", async () => {
    const req = { headers: { authorization: "Bearer bad" } };
    const res = createRes();
    const next = jest.fn();

    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error("bad token");
    });

    await authMiddleware(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("AUTH_INVALID");
  });

  test("rejects non-access token", async () => {
    const req = { headers: { authorization: "Bearer refresh" } };
    const res = createRes();
    const next = jest.fn();

    mockVerifyAccessToken.mockReturnValue({ id: "u1", tokenType: "refresh" });

    await authMiddleware(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("AUTH_INVALID");
  });

  test("rejects when user not found", async () => {
    const req = { headers: { authorization: "Bearer good" } };
    const res = createRes();
    const next = jest.fn();

    mockVerifyAccessToken.mockReturnValue({ id: "u1", tokenType: "access" });
    mockFindById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await authMiddleware(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("AUTH_INVALID");
  });

  test("sets req.user on success", async () => {
    const req = { headers: { authorization: "Bearer good" } };
    const res = createRes();
    const next = jest.fn();
    const user = { _id: "u1", role: "user" };

    mockVerifyAccessToken.mockReturnValue({ id: "u1", tokenType: "access" });
    mockFindById.mockReturnValue({
      select: jest.fn().mockResolvedValue(user),
    });

    await authMiddleware(req, res, next);

    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledWith();
  });
});

