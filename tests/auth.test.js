// AUTHENTICATION TESTS - These test user registration and login

import request from "supertest";
import app from "./app.js";

describe("Authentication Tests", () => {
  test("should register a new user successfully", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    };

    const response = await request(app)
      .post("/api/auth/register")
      .send(userData)
      .expect(201);

    expect(response.body).toHaveProperty("token");
    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");
    expect(response.body).toHaveProperty("userId");
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("__Host-swiftly_helpdesk_at="),
        expect.stringContaining("__Host-swiftly_helpdesk_rt="),
      ])
    );
  });

  test("should fail to register user with missing required fields", async () => {
    const invalidUserData = {
      password: "password123",
      name: "Test User",
    };

    const response = await request(app)
      .post("/api/auth/register")
      .send(invalidUserData)
      .expect(400);

    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toBeTruthy();
  });

  test("should fail to register user when role is provided", async () => {
    const userData = {
      email: "roleblock@example.com",
      password: "password123",
      name: "Role Block",
      role: "admin",
    };

    const response = await request(app)
      .post("/api/auth/register")
      .send(userData)
      .expect(400);

    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toBeTruthy();
  });

  test("should login user with correct credentials", async () => {
    const testUser = {
      email: "login@example.com",
      password: "password123",
      name: "Login Test User",
    };

    await request(app).post("/api/auth/register").send(testUser).expect(201);

    const loginData = {
      email: testUser.email,
      password: testUser.password,
    };

    const response = await request(app)
      .post("/api/auth/login")
      .send(loginData)
      .expect(200);

    expect(response.body).toHaveProperty("token");
    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");
    expect(response.body).toHaveProperty("userId");
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("__Host-swiftly_helpdesk_at="),
        expect.stringContaining("__Host-swiftly_helpdesk_rt="),
      ])
    );
  });

  test("should fail to login with wrong password", async () => {
    const testUser = {
      email: "wrongpass@example.com",
      password: "correctpassword",
      name: "Wrong Password Test",
    };

    await request(app).post("/api/auth/register").send(testUser).expect(201);

    const wrongLoginData = {
      email: testUser.email,
      password: "wrongpassword",
    };

    const response = await request(app)
      .post("/api/auth/login")
      .send(wrongLoginData)
      .expect(401);

    expect(response.body).toHaveProperty("message");
  });

  test("should fail to login non-existent user", async () => {
    const nonExistentUser = {
      email: "doesnotexist@example.com",
      password: "somepassword",
    };

    const response = await request(app)
      .post("/api/auth/login")
      .send(nonExistentUser)
      .expect(401);

    expect(response.body).toHaveProperty("message");
  });

  test("should refresh tokens with a valid refresh token", async () => {
    const testUser = {
      email: "refresh@example.com",
      password: "password123",
      name: "Refresh User",
    };

    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send(testUser)
      .expect(201);

    const refreshResponse = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: registerResponse.body.refreshToken })
      .expect(200);

    expect(refreshResponse.body).toHaveProperty("accessToken");
    expect(refreshResponse.body).toHaveProperty("refreshToken");
    expect(refreshResponse.body.refreshToken).not.toBe(
      registerResponse.body.refreshToken
    );
  });

  test("should refresh tokens using refresh cookie when body is empty", async () => {
    const testUser = {
      email: "refresh-cookie@example.com",
      password: "password123",
      name: "Refresh Cookie User",
    };

    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send(testUser)
      .expect(201);

    const refreshCookie = registerResponse.headers["set-cookie"].find(cookie =>
      cookie.startsWith("__Host-swiftly_helpdesk_rt=")
    );

    const refreshResponse = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", refreshCookie)
      .send({})
      .expect(200);

    expect(refreshResponse.body).toHaveProperty("accessToken");
    expect(refreshResponse.body).toHaveProperty("refreshToken");
  });

  test("should reject reuse of rotated refresh token and allow latest token", async () => {
    const testUser = {
      email: "rotation@example.com",
      password: "password123",
      name: "Rotation User",
    };

    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send(testUser)
      .expect(201);

    const firstRefresh = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: registerResponse.body.refreshToken })
      .expect(200);

    await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: registerResponse.body.refreshToken })
      .expect(401)
      .expect(({ body }) => {
        expect(body).toHaveProperty("code", "AUTH_REFRESH_REVOKED");
      });

    await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: firstRefresh.body.refreshToken })
      .expect(200);
  });

  test("should reject refresh for invalid refresh token", async () => {
    const response = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "invalid-refresh-token" })
      .expect(401);

    expect(response.body).toHaveProperty("code", "AUTH_INVALID_REFRESH");
  });

  test("should revoke refresh token on logout", async () => {
    const testUser = {
      email: "logout@example.com",
      password: "password123",
      name: "Logout User",
    };

    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send(testUser)
      .expect(201);

    await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${registerResponse.body.accessToken}`)
      .send({ refreshToken: registerResponse.body.refreshToken })
      .expect(200);

    const refreshAfterLogout = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: registerResponse.body.refreshToken })
      .expect(401);

    expect(refreshAfterLogout.body).toHaveProperty(
      "code",
      "AUTH_REFRESH_REVOKED"
    );
  });

  test("should revoke all sessions and block refresh tokens from each session", async () => {
    const testUser = {
      email: "logout-all@example.com",
      password: "password123",
      name: "Logout All User",
    };

    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send(testUser)
      .expect(201);

    const secondSession = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: registerResponse.body.refreshToken })
      .expect(200);

    await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${secondSession.body.accessToken}`)
      .send({ allSessions: true })
      .expect(200);

    await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: registerResponse.body.refreshToken })
      .expect(401)
      .expect(({ body }) => {
        expect(body).toHaveProperty("code", "AUTH_REFRESH_REVOKED");
      });

    await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: secondSession.body.refreshToken })
      .expect(401)
      .expect(({ body }) => {
        expect(body).toHaveProperty("code", "AUTH_REFRESH_REVOKED");
      });
  });

  test("should reject using refresh token as bearer token", async () => {
    const testUser = {
      email: "refresh-as-access@example.com",
      password: "password123",
      name: "Refresh As Access User",
    };

    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send(testUser)
      .expect(201);

    await request(app)
      .get("/api/auth/admins")
      .set("Authorization", `Bearer ${registerResponse.body.refreshToken}`)
      .expect(401);
  });

  test("should return user context from /auth/me using access cookie", async () => {
    const testUser = {
      email: "me-cookie@example.com",
      password: "password123",
      name: "Me Cookie User",
    };

    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send(testUser)
      .expect(201);

    const accessCookie = registerResponse.headers["set-cookie"].find(cookie =>
      cookie.startsWith("__Host-swiftly_helpdesk_at=")
    );

    const meResponse = await request(app)
      .get("/api/auth/me")
      .set("Cookie", accessCookie)
      .expect(200);

    expect(meResponse.body).toHaveProperty("authenticated", true);
    expect(meResponse.body).toHaveProperty("user");
    expect(meResponse.body.user).toHaveProperty("email", testUser.email);
  });
});
