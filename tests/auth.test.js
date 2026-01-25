// AUTHENTICATION TESTS - These test user registration and login
//
// What are we testing?
// - Can users register with valid information?
// - What happens when users try to register with missing information?
// - Can users log in with correct credentials?
// - What happens when users try to log in with wrong credentials?

import request from "supertest";
import app from "./app.js";

describe("Authentication Tests", () => {
  // Test 1: User Registration with valid data
  test("should register a new user successfully", async () => {
    // Create test user data
    const userData = {
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    };

    // Send registration request
    const response = await request(app)
      .post("/api/auth/register")
      .send(userData)
      .expect(201); // 201 means "created successfully"

    // Check if we got a token back
    expect(response.body).toHaveProperty("token");
    expect(response.body).toHaveProperty("userId");

    console.log("User registration test passed!");
  });

  // Test 2: Registration should fail with missing information
  test("should fail to register user with missing required fields", async () => {
    // Try to register without email
    const invalidUserData = {
      password: "password123",
      name: "Test User",
      // missing email
    };

    const response = await request(app)
      .post("/api/auth/register")
      .send(invalidUserData)
      .expect(400); // 400 means "bad request"

    // Check if we got an error message
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toBeTruthy();

    console.log("Registration validation test passed!");
  });

  // Test 2b: Registration should fail when role is provided
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

    console.log("Role blocked on registration test passed!");
  });

  // Test 3: User Login with correct credentials
  test("should login user with correct credentials", async () => {
    // First, create a user to test login with
    const testUser = {
      email: "login@example.com",
      password: "password123",
      name: "Login Test User",
    };

    // Register the user first
    await request(app).post("/api/auth/register").send(testUser).expect(201);

    // Now try to login with the same credentials
    const loginData = {
      email: testUser.email,
      password: testUser.password,
    };

    const response = await request(app)
      .post("/api/auth/login")
      .send(loginData)
      .expect(200); // 200 means success

    // Check if we got a token back
    expect(response.body).toHaveProperty("token");
    expect(response.body).toHaveProperty("userId");

    console.log("User login test passed!");
  });

  // Test 4: Login should fail with wrong password
  test("should fail to login with wrong password", async () => {
    // First, create a user
    const testUser = {
      email: "wrongpass@example.com",
      password: "correctpassword",
      name: "Wrong Password Test",
    };

    await request(app).post("/api/auth/register").send(testUser).expect(201);

    // Try to login with wrong password
    const wrongLoginData = {
      email: testUser.email,
      password: "wrongpassword", // This is wrong
    };

    const response = await request(app)
      .post("/api/auth/login")
      .send(wrongLoginData)
      .expect(401); // 401 means "unauthorized"

    // Should get an error message
    expect(response.body).toHaveProperty("message");

    console.log("Wrong password test passed!");
  });

  // Test 5: Login should fail for non-existent user
  test("should fail to login non-existent user", async () => {
    const nonExistentUser = {
      email: "doesnotexist@example.com",
      password: "somepassword",
    };

    const response = await request(app)
      .post("/api/auth/login")
      .send(nonExistentUser)
      .expect(401); // API returns 401 for "Invalid email or password"

    expect(response.body).toHaveProperty("message");

    console.log("Non-existent user test passed!");
  });
});
