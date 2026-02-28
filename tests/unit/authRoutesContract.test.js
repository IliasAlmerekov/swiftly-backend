import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";
import { readFile } from "node:fs/promises";
import { createAuthController } from "../../src/controllers/authController.js";
import { createAuthRoutes } from "../../src/routes/authRoutes.js";
import {
  authModes,
  authEndpointPolicy,
  getAuthEndpointPolicy,
} from "../../src/config/authEndpointPolicy.js";
import { notFound } from "../../src/middlewares/notFound.js";
import { errorHandler } from "../../src/middlewares/errorHandler.js";

const mockRegister = jest.fn();
const mockLogin = jest.fn();
const mockRefresh = jest.fn();
const mockLogout = jest.fn();
const mockListAssignableAdmins = jest.fn();
const mockResolveAuthContext = jest.fn();
const mockResolveTokenExpiryDates = jest.fn();

const authService = {
  register: mockRegister,
  login: mockLogin,
  refresh: mockRefresh,
  logout: mockLogout,
  listAssignableAdmins: mockListAssignableAdmins,
  resolveAuthContext: mockResolveAuthContext,
  resolveTokenExpiryDates: mockResolveTokenExpiryDates,
};

const authMiddleware = jest.fn((req, _res, next) => {
  req.user = { _id: "507f1f77bcf86cd799439011", role: "admin" };
  next();
});

const authController = createAuthController({ authService });
const authRoutes = createAuthRoutes({ authController, authMiddleware });

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  if (req.method === "GET" && req.path === "/api/auth/csrf") {
    res.locals.csrfToken = "contract-csrf-token";
  }
  next();
});
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
    mockResolveAuthContext.mockResolvedValue({
      _id: "u1",
      email: "contract@example.com",
      name: "Contract User",
      role: "user",
      password: "never-leak",
    });
    mockLogout.mockResolvedValue({ message: "Logged out successfully" });
    mockListAssignableAdmins.mockResolvedValue([]);
  });

  test("returns strict auth payload shape on register", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "contract@example.com",
      password: "secret123",
      name: "Contract User",
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      authenticated: true,
      user: {
        _id: "u1",
        email: "contract@example.com",
        name: "Contract User",
        role: "user",
      },
    });
    expect(response.body).not.toHaveProperty("token");
    expect(response.body).not.toHaveProperty("accessToken");
    expect(response.body).not.toHaveProperty("refreshToken");
    expect(response.body).not.toHaveProperty("userId");
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("__Host-swiftly_helpdesk_at="),
        expect.stringContaining("__Host-swiftly_helpdesk_rt="),
      ])
    );
  });

  test("returns strict auth payload shape on login", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "secret123",
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      authenticated: true,
      user: {
        _id: "u1",
        email: "contract@example.com",
        name: "Contract User",
        role: "user",
      },
    });
    expect(response.body).not.toHaveProperty("token");
    expect(response.body).not.toHaveProperty("accessToken");
    expect(response.body).not.toHaveProperty("refreshToken");
    expect(response.body).not.toHaveProperty("userId");
  });

  test("returns csrf bootstrap payload shape", async () => {
    const response = await request(app).get("/api/auth/csrf").expect(200);

    expect(response.body).toMatchObject({
      csrfToken: expect.any(String),
    });
    expect(response.body.csrfToken.length).toBeGreaterThan(10);
  });

  test("returns strict refresh payload shape", async () => {
    const response = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "__Host-swiftly_helpdesk_rt=refresh-from-cookie")
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ authenticated: true });
    expect(response.body).not.toHaveProperty("token");
    expect(response.body).not.toHaveProperty("accessToken");
    expect(response.body).not.toHaveProperty("refreshToken");
    expect(response.body).not.toHaveProperty("userId");
    expect(mockRefresh).toHaveBeenCalledWith({
      refreshToken: "refresh-from-cookie",
    });
  });

  test("rejects refresh request body token", async () => {
    const response = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "refresh-from-body" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "AUTH_COOKIE_REQUIRED",
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  test("rejects mixed refresh inputs", async () => {
    const response = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "__Host-swiftly_helpdesk_rt=refresh-from-cookie")
      .send({ refreshToken: "refresh-from-body" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "AUTH_COOKIE_REQUIRED",
    });
    expect(mockRefresh).not.toHaveBeenCalled();
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

  test("uses expected auth policy mapping for auth endpoints", () => {
    expect(authEndpointPolicy["POST /register"]).toMatchObject({
      authMode: authModes.none,
    });
    expect(authEndpointPolicy["POST /login"]).toMatchObject({
      authMode: authModes.none,
    });
    expect(authEndpointPolicy["GET /csrf"]).toMatchObject({
      authMode: authModes.none,
    });
    expect(authEndpointPolicy["POST /refresh"]).toMatchObject({
      authMode: authModes.none,
      refreshTokenSource: "cookie",
    });
    expect(authEndpointPolicy["POST /logout"]).toMatchObject({
      authMode: authModes.required,
      requiredAuthSource: "cookie",
    });
    expect(authEndpointPolicy["GET /me"]).toMatchObject({
      authMode: authModes.required,
      requiredAuthSource: "cookie",
    });
    expect(authEndpointPolicy["GET /admins"]).toMatchObject({
      authMode: authModes.required,
      requiredAuthSource: "cookie",
    });
  });

  test("does not run auth middleware for public auth endpoints", async () => {
    await request(app).post("/api/auth/register").send({
      email: "public-register@example.com",
      password: "secret123",
      name: "Public Register",
    });
    await request(app).post("/api/auth/login").send({
      email: "public-login@example.com",
      password: "secret123",
    });
    await request(app).get("/api/auth/csrf").expect(200);
    await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "__Host-swiftly_helpdesk_rt=refresh-from-cookie")
      .send({});

    expect(authMiddleware).not.toHaveBeenCalled();
  });

  test("runs auth middleware for protected auth endpoints", async () => {
    await request(app).get("/api/auth/me").expect(200);
    await request(app).get("/api/auth/admins").expect(200);
    await request(app)
      .post("/api/auth/logout")
      .send({ refreshToken: "refresh-token" })
      .expect(200);

    expect(authMiddleware).toHaveBeenCalledTimes(3);
  });

  test("fails fast at init when protected endpoint cookie auth source policy is missing", () => {
    expect(() =>
      createAuthRoutes({
        authController: {
          register: jest.fn(),
          login: jest.fn(),
          csrf: jest.fn(),
          refresh: jest.fn(),
          logout: jest.fn(),
          me: jest.fn(),
          getAdmins: jest.fn(),
        },
        authMiddleware,
        resolveAuthEndpointPolicy: ({ method, path }) => {
          const policy = getAuthEndpointPolicy({ method, path });

          if (method === "post" && path === "/logout") {
            return {
              ...policy,
              requiredAuthSource: undefined,
            };
          }

          return policy;
        },
      })
    ).toThrow(
      "Auth endpoint policy must require cookie auth source for: POST /logout"
    );
  });

  test("fails fast at init when refresh cookie-source policy metadata is missing", () => {
    expect(() =>
      createAuthRoutes({
        authController: {
          register: jest.fn(),
          login: jest.fn(),
          csrf: jest.fn(),
          refresh: jest.fn(),
          logout: jest.fn(),
          me: jest.fn(),
          getAdmins: jest.fn(),
        },
        authMiddleware,
        resolveAuthEndpointPolicy: ({ method, path }) => {
          const policy = getAuthEndpointPolicy({ method, path });

          if (method === "post" && path === "/refresh") {
            return {
              ...policy,
              refreshTokenSource: undefined,
            };
          }

          return policy;
        },
      })
    ).toThrow(
      "Auth endpoint policy must require cookie refresh source for: POST /refresh"
    );
  });

  test("fails fast at init when route policy is missing", () => {
    const controller = {
      register: jest.fn(),
      login: jest.fn(),
      csrf: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      me: jest.fn(),
      getAdmins: jest.fn(),
    };
    const missingRouteError = new Error(
      "Auth endpoint policy is missing for: POST /refresh"
    );

    expect(() =>
      createAuthRoutes({
        authController: controller,
        authMiddleware,
        resolveAuthEndpointPolicy: ({ method, path }) => {
          if (method === "post" && path === "/refresh") {
            throw missingRouteError;
          }

          return getAuthEndpointPolicy({ method, path });
        },
      })
    ).toThrow(missingRouteError.message);
  });
});
