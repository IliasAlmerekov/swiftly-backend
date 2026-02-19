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

    expect(refreshAfterLogout.body).toHaveProperty("code", "AUTH_REFRESH_REVOKED");
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
});

