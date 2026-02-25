import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";
import { readFile } from "node:fs/promises";
import { createAuthController } from "../../src/controllers/authController.js";
import { createAuthRoutes } from "../../src/routes/authRoutes.js";
import { notFound } from "../../src/middlewares/notFound.js";
import { errorHandler } from "../../src/middlewares/errorHandler.js";

const mockRegister = jest.fn();
const mockLogin = jest.fn();
const mockRefresh = jest.fn();
const mockLogout = jest.fn();
const mockListAssignableAdmins = jest.fn();
const mockResolveTokenExpiryDates = jest.fn();

const authService = {
  register: mockRegister,
  login: mockLogin,
  refresh: mockRefresh,
  logout: mockLogout,
  listAssignableAdmins: mockListAssignableAdmins,
  resolveTokenExpiryDates: mockResolveTokenExpiryDates,
};

const authMiddleware = (req, _res, next) => {
  req.user = { _id: "507f1f77bcf86cd799439011", role: "admin" };
  next();
};

const authController = createAuthController({ authService });
const authRoutes = createAuthRoutes({ authController, authMiddleware });

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use(notFound);
app.use(errorHandler);

describe("auth routes contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRegister.mockResolvedValue({
      userId: "u1",
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    mockLogin.mockResolvedValue({
      userId: "u1",
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    mockRefresh.mockResolvedValue({
      userId: "u1",
      accessToken: "access-token-next",
      refreshToken: "refresh-token-next",
    });
    mockResolveTokenExpiryDates.mockReturnValue({
      accessTokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
      refreshTokenExpiresAt: new Date("2030-01-08T00:00:00.000Z"),
    });
    mockLogout.mockResolvedValue({ message: "Logged out successfully" });
    mockListAssignableAdmins.mockResolvedValue([]);
  });

  test("returns expected auth payload shape on register", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "contract@example.com",
      password: "secret123",
      name: "Contract User",
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      token: "access-token",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      userId: "u1",
    });
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("__Host-swiftly_helpdesk_at="),
        expect.stringContaining("__Host-swiftly_helpdesk_rt="),
      ])
    );
  });

  test("returns centralized 400 validation error for invalid register body", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "123",
      name: "",
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(typeof response.body.message).toBe("string");
    expect(response.body.message.length).toBeGreaterThan(0);
  });

  test("returns centralized 500 error when auth service throws", async () => {
    mockLogin.mockRejectedValueOnce(new Error("boom"));

    const response = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "secret123",
    });

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      code: "INTERNAL_ERROR",
      message: "Internal Server Error",
    });
  });

  test("returns centralized 400 validation error for invalid refresh payload", async () => {
    const response = await request(app).post("/api/auth/refresh").send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  test("accepts refresh token from cookie when body is empty", async () => {
    const response = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "__Host-swiftly_helpdesk_rt=refresh-from-cookie")
      .send({});

    expect(response.status).toBe(200);
    expect(mockRefresh).toHaveBeenCalledWith({
      refreshToken: "refresh-from-cookie",
    });
  });

  test("returns auth context via /api/auth/me", async () => {
    const response = await request(app).get("/api/auth/me").expect(200);

    expect(response.body).toMatchObject({
      authenticated: true,
      user: {
        _id: "507f1f77bcf86cd799439011",
        role: "admin",
      },
    });
  });

  test("does not read configuration from process.env in auth routes", async () => {
    const source = await readFile("src/routes/authRoutes.js", "utf8");

    expect(source).not.toMatch(/\bprocess\.env\b/);
  });
});
