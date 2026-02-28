import request from "supertest";
import app from "./app.js";

const getCookieByPrefix = (cookies = [], prefix) =>
  cookies.find(cookie => cookie.startsWith(prefix));

const toCookiePair = cookie => cookie.split(";")[0];

const getCookieValue = (cookies = [], cookieName) => {
  const cookie = getCookieByPrefix(cookies, `${cookieName}=`);
  if (!cookie) {
    return undefined;
  }

  return cookie.split(";")[0].split("=").slice(1).join("=");
};

const getCsrfToken = cookies =>
  getCookieValue(cookies, "__Host-swiftly_helpdesk_csrf") ||
  getCookieValue(cookies, "swiftly_helpdesk_csrf");

const bootstrapCsrf = async agent => {
  const response = await agent.get("/api/health").expect(200);
  const csrfToken = getCsrfToken(response.headers["set-cookie"]);
  expect(csrfToken).toBeTruthy();
  return csrfToken;
};

describe("Authentication Tests", () => {
  test("should register a new user successfully with strict response body", async () => {
    const agent = request.agent(app);
    const csrfToken = await bootstrapCsrf(agent);
    const userData = {
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    };

    const response = await agent
      .post("/api/auth/register")
      .set("X-CSRF-Token", csrfToken)
      .send(userData)
      .expect(201);

    expect(response.body).toHaveProperty("authenticated", true);
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toHaveProperty("email", userData.email);
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

  test("should fail to register user with missing required fields", async () => {
    const agent = request.agent(app);
    const csrfToken = await bootstrapCsrf(agent);

    const response = await agent
      .post("/api/auth/register")
      .set("X-CSRF-Token", csrfToken)
      .send({ password: "password123", name: "Test User" })
      .expect(400);

    expect(response.body).toHaveProperty("message");
  });

  test("should login user with strict response body", async () => {
    const registerAgent = request.agent(app);
    const registerCsrf = await bootstrapCsrf(registerAgent);
    const testUser = {
      email: "login@example.com",
      password: "password123",
      name: "Login Test User",
    };

    await registerAgent
      .post("/api/auth/register")
      .set("X-CSRF-Token", registerCsrf)
      .send(testUser)
      .expect(201);

    const agent = request.agent(app);
    const csrfToken = await bootstrapCsrf(agent);
    const response = await agent
      .post("/api/auth/login")
      .set("X-CSRF-Token", csrfToken)
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200);

    expect(response.body).toHaveProperty("authenticated", true);
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toHaveProperty("email", testUser.email);
    expect(response.body).not.toHaveProperty("token");
    expect(response.body).not.toHaveProperty("accessToken");
    expect(response.body).not.toHaveProperty("refreshToken");
    expect(response.body).not.toHaveProperty("userId");
  });

  test("should refresh session using refresh cookie", async () => {
    const agent = request.agent(app);
    const csrfToken = await bootstrapCsrf(agent);
    const testUser = {
      email: "refresh@example.com",
      password: "password123",
      name: "Refresh User",
    };

    const registerResponse = await agent
      .post("/api/auth/register")
      .set("X-CSRF-Token", csrfToken)
      .send(testUser)
      .expect(201);

    const refreshCookie = getCookieByPrefix(
      registerResponse.headers["set-cookie"],
      "__Host-swiftly_helpdesk_rt="
    );

    const refreshResponse = await agent
      .post("/api/auth/refresh")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", refreshCookie)
      .send({})
      .expect(200);

    expect(refreshResponse.body).toEqual({ authenticated: true });
    expect(refreshResponse.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("__Host-swiftly_helpdesk_at="),
        expect.stringContaining("__Host-swiftly_helpdesk_rt="),
      ])
    );
  });

  test("should reject refresh when token is provided only in request body", async () => {
    const agent = request.agent(app);
    const csrfToken = await bootstrapCsrf(agent);

    const response = await agent
      .post("/api/auth/refresh")
      .set("X-CSRF-Token", csrfToken)
      .send({ refreshToken: "body-only-token" })
      .expect(400);

    expect(response.body).toHaveProperty("code", "AUTH_COOKIE_REQUIRED");
    expect(response.headers["set-cookie"] ?? []).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("__Host-swiftly_helpdesk_at="),
      ])
    );
  });

  test("should reject reuse of rotated refresh token and allow latest token", async () => {
    const agent = request.agent(app);
    const csrfToken = await bootstrapCsrf(agent);
    const testUser = {
      email: "rotation@example.com",
      password: "password123",
      name: "Rotation User",
    };

    const registerResponse = await agent
      .post("/api/auth/register")
      .set("X-CSRF-Token", csrfToken)
      .send(testUser)
      .expect(201);
    const initialRefreshCookie = getCookieByPrefix(
      registerResponse.headers["set-cookie"],
      "__Host-swiftly_helpdesk_rt="
    );
    const initialRefreshCookiePair = toCookiePair(initialRefreshCookie);

    const firstRefresh = await agent
      .post("/api/auth/refresh")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", initialRefreshCookiePair)
      .send({})
      .expect(200);
    const rotatedRefreshCookie = getCookieByPrefix(
      firstRefresh.headers["set-cookie"],
      "__Host-swiftly_helpdesk_rt="
    );
    const rotatedRefreshCookiePair = toCookiePair(rotatedRefreshCookie);

    await request(app)
      .post("/api/auth/refresh")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", [
        initialRefreshCookiePair,
        `__Host-swiftly_helpdesk_csrf=${csrfToken}`,
      ])
      .send({})
      .expect(401)
      .expect(({ body }) => {
        expect(body).toHaveProperty("code", "AUTH_REFRESH_REVOKED");
      });

    await request(app)
      .post("/api/auth/refresh")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", [
        rotatedRefreshCookiePair,
        `__Host-swiftly_helpdesk_csrf=${csrfToken}`,
      ])
      .send({})
      .expect(200);
  });

  test("should reject refresh for invalid refresh token in cookie", async () => {
    const agent = request.agent(app);
    const csrfToken = await bootstrapCsrf(agent);

    await agent
      .post("/api/auth/refresh")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", "__Host-swiftly_helpdesk_rt=invalid-refresh-token")
      .send({})
      .expect(401)
      .expect(({ body }) => {
        expect(body).toHaveProperty("code", "AUTH_INVALID_REFRESH");
      });
  });

  test("should revoke refresh token on logout using cookie auth", async () => {
    const agent = request.agent(app);
    const csrfToken = await bootstrapCsrf(agent);
    const testUser = {
      email: "logout@example.com",
      password: "password123",
      name: "Logout User",
    };

    const registerResponse = await agent
      .post("/api/auth/register")
      .set("X-CSRF-Token", csrfToken)
      .send(testUser)
      .expect(201);
    const setCookies = registerResponse.headers["set-cookie"];
    const refreshCookie = getCookieByPrefix(
      setCookies,
      "__Host-swiftly_helpdesk_rt="
    );
    const refreshCookiePair = toCookiePair(refreshCookie);

    await agent
      .post("/api/auth/logout")
      .set("X-CSRF-Token", csrfToken)
      .send({})
      .expect(200);

    await request(app)
      .post("/api/auth/refresh")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", [
        refreshCookiePair,
        `__Host-swiftly_helpdesk_csrf=${csrfToken}`,
      ])
      .send({})
      .expect(401)
      .expect(({ body }) => {
        expect(body).toHaveProperty("code", "AUTH_REFRESH_REVOKED");
      });
  });

  test("should revoke all sessions and block refresh tokens from each session", async () => {
    const agent = request.agent(app);
    const csrfToken = await bootstrapCsrf(agent);
    const testUser = {
      email: "logout-all@example.com",
      password: "password123",
      name: "Logout All User",
    };

    const registerResponse = await agent
      .post("/api/auth/register")
      .set("X-CSRF-Token", csrfToken)
      .send(testUser)
      .expect(201);
    const firstSessionRefreshCookie = getCookieByPrefix(
      registerResponse.headers["set-cookie"],
      "__Host-swiftly_helpdesk_rt="
    );
    const firstSessionRefreshCookiePair = toCookiePair(firstSessionRefreshCookie);

    const secondSession = await agent
      .post("/api/auth/refresh")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", firstSessionRefreshCookiePair)
      .send({})
      .expect(200);
    const secondSessionRefreshCookie = getCookieByPrefix(
      secondSession.headers["set-cookie"],
      "__Host-swiftly_helpdesk_rt="
    );
    const secondSessionRefreshCookiePair = toCookiePair(secondSessionRefreshCookie);

    await agent
      .post("/api/auth/logout")
      .set("X-CSRF-Token", csrfToken)
      .send({ allSessions: true })
      .expect(200);

    await request(app)
      .post("/api/auth/refresh")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", [
        firstSessionRefreshCookiePair,
        `__Host-swiftly_helpdesk_csrf=${csrfToken}`,
      ])
      .send({})
      .expect(401)
      .expect(({ body }) => {
        expect(body).toHaveProperty("code", "AUTH_REFRESH_REVOKED");
      });

    await request(app)
      .post("/api/auth/refresh")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", [
        secondSessionRefreshCookiePair,
        `__Host-swiftly_helpdesk_csrf=${csrfToken}`,
      ])
      .send({})
      .expect(401)
      .expect(({ body }) => {
        expect(body).toHaveProperty("code", "AUTH_REFRESH_REVOKED");
      });
  });

  test("should reject bearer-only auth for browser auth endpoints", async () => {
    const registerAgent = request.agent(app);
    const registerCsrf = await bootstrapCsrf(registerAgent);

    const registerResponse = await registerAgent
      .post("/api/auth/register")
      .set("X-CSRF-Token", registerCsrf)
      .send({
        email: "refresh-as-access@example.com",
        password: "password123",
        name: "Refresh As Access User",
      })
      .expect(201);
    const accessCookie = getCookieByPrefix(
      registerResponse.headers["set-cookie"],
      "__Host-swiftly_helpdesk_at="
    );
    const token = accessCookie.split(";")[0].split("=")[1];
    const browserAgent = request.agent(app);
    const browserCsrf = await bootstrapCsrf(browserAgent);

    await browserAgent
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    await browserAgent
      .get("/api/auth/admins")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    await browserAgent
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .set("X-CSRF-Token", browserCsrf)
      .send({})
      .expect(401);
  });

  test("should return user context from /auth/me using access cookie", async () => {
    const agent = request.agent(app);
    const csrfToken = await bootstrapCsrf(agent);
    const testUser = {
      email: "me-cookie@example.com",
      password: "password123",
      name: "Me Cookie User",
    };

    const registerResponse = await agent
      .post("/api/auth/register")
      .set("X-CSRF-Token", csrfToken)
      .send(testUser)
      .expect(201);

    const accessCookie = getCookieByPrefix(
      registerResponse.headers["set-cookie"],
      "__Host-swiftly_helpdesk_at="
    );

    const meResponse = await agent
      .get("/api/auth/me")
      .set("Cookie", accessCookie)
      .expect(200);

    expect(meResponse.body).toHaveProperty("authenticated", true);
    expect(meResponse.body).toHaveProperty("user");
    expect(meResponse.body.user).toHaveProperty("email", testUser.email);
  });

  test("should reject state-changing request without csrf token", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        email: "no-csrf@example.com",
        password: "password123",
        name: "No Csrf",
      })
      .expect(403)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: "CSRF_INVALID",
          message: "Invalid CSRF token",
        });
      });
  });

  test("should reject state-changing request with invalid csrf token", async () => {
    const agent = request.agent(app);
    await bootstrapCsrf(agent);

    await agent
      .post("/api/auth/register")
      .set("X-CSRF-Token", "invalid-csrf-token")
      .send({
        email: "invalid-csrf@example.com",
        password: "password123",
        name: "Invalid Csrf",
      })
      .expect(403)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: "CSRF_INVALID",
          message: "Invalid CSRF token",
        });
      });
  });
});
