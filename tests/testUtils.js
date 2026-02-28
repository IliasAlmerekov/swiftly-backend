// Test utilities — shared cookie-based auth helpers
//
// Every helper uses httpOnly cookie auth + CSRF double-submit,
// matching the production auth contract (see docs/AUTH_CONTRACT.md).

import request from "supertest";
import bcrypt from "bcryptjs";
import app from "./app.js";
import User from "../src/models/userModel.js";

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

/** Find the first Set-Cookie string whose name starts with `prefix`. */
export const getCookieByPrefix = (cookies = [], prefix) =>
  cookies.find(cookie => cookie.startsWith(prefix));

/** Extract just the `name=value` pair (strip attributes after `;`). */
export const toCookiePair = cookie => cookie.split(";")[0];

/** Return the *value* of a named cookie from a Set-Cookie array. */
export const getCookieValue = (cookies = [], cookieName) => {
  const cookie = getCookieByPrefix(cookies, `${cookieName}=`);
  if (!cookie) return undefined;
  return cookie.split(";")[0].split("=").slice(1).join("=");
};

/** Read the CSRF token value from Set-Cookie headers. */
export const getCsrfToken = cookies =>
  getCookieValue(cookies, "__Host-swiftly_helpdesk_csrf") ||
  getCookieValue(cookies, "swiftly_helpdesk_csrf");

/**
 * Hit a safe endpoint to obtain the CSRF cookie, then return the token.
 *
 * @param {import("supertest").SuperAgentTest} agent
 * @returns {Promise<string>} CSRF token value
 */
export const bootstrapCsrf = async agent => {
  const response = await agent.get("/api/health").expect(200);
  const csrfToken = getCsrfToken(response.headers["set-cookie"]);
  expect(csrfToken).toBeTruthy();
  return csrfToken;
};

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

/**
 * Register a regular user and return an authenticated agent + CSRF token.
 *
 * @param {Object} userData - Registration payload (email, password, name)
 * @returns {Promise<{agent: import("supertest").SuperAgentTest, csrfToken: string}>}
 */
export const createUserSession = async (userData = {}) => {
  const defaults = {
    email: "test@example.com",
    password: "password123",
    name: "Test User",
    ...userData,
  };

  const agent = request.agent(app);
  const csrfToken = await bootstrapCsrf(agent);

  await agent
    .post("/api/auth/register")
    .set("X-CSRF-Token", csrfToken)
    .send(defaults)
    .expect(201);

  return { agent, csrfToken };
};

/**
 * Create an admin user directly in the DB, then log in via cookie auth.
 *
 * Admin creation bypasses the registration endpoint because registration
 * ignores the `role` field for security.  The password is hashed explicitly
 * because the Mongoose pre-save hook was removed (BP 1.2).
 *
 * @param {Object} [adminData] - Override admin fields
 * @returns {Promise<{agent: import("supertest").SuperAgentTest, csrfToken: string}>}
 */
export const createAdminSession = async (adminData = {}) => {
  const defaults = {
    email: "admin@example.com",
    password: "password123",
    name: "Admin User",
    role: "admin",
    ...adminData,
  };

  await User.create({
    ...defaults,
    password: await bcrypt.hash(defaults.password, 12),
  });

  const agent = request.agent(app);
  const csrfToken = await bootstrapCsrf(agent);

  await agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", csrfToken)
    .send({ email: defaults.email, password: defaults.password })
    .expect(200);

  return { agent, csrfToken };
};

/**
 * Create both a regular-user session and an admin session.
 *
 * @returns {Promise<{regularUser: {agent, csrfToken}, adminUser: {agent, csrfToken}}>}
 */
export const createTestUsers = async () => {
  const regularUser = await createUserSession({
    email: "user@test.com",
    name: "Regular User",
  });

  const adminUser = await createAdminSession({
    email: "admin@test.com",
    name: "Admin User",
  });

  return { regularUser, adminUser };
};

// ---------------------------------------------------------------------------
// Ticket helpers
// ---------------------------------------------------------------------------

/**
 * Create a ticket using an authenticated session.
 *
 * @param {{agent: import("supertest").SuperAgentTest, csrfToken: string}} session
 * @param {Object} [ticketData] - Override ticket fields
 * @returns {Promise<Object>} Created ticket body
 */
export const createTicket = async ({ agent, csrfToken }, ticketData = {}) => {
  const defaults = {
    title: "Test Ticket",
    description: "Test ticket description",
    priority: "medium",
    category: "general",
    ...ticketData,
  };

  const response = await agent
    .post("/api/tickets")
    .set("X-CSRF-Token", csrfToken)
    .send(defaults)
    .expect(201);

  return response.body;
};

/**
 * Make an authenticated request using a cookie session.
 *
 * @param {string} method - HTTP method (get, post, put, delete)
 * @param {string} url - Request URL
 * @param {{agent: import("supertest").SuperAgentTest, csrfToken: string}} session
 * @param {Object} [data] - Request body for POST/PUT
 * @returns {import("supertest").Test}
 */
export const makeAuthenticatedRequest = (
  method,
  url,
  { agent, csrfToken },
  data = null
) => {
  const req = agent[method.toLowerCase()](url).set("X-CSRF-Token", csrfToken);

  if (data && ["post", "put", "patch"].includes(method.toLowerCase())) {
    req.send(data);
  }

  return req;
};

// ---------------------------------------------------------------------------
// Sample data & validators (unchanged, still useful as fixtures)
// ---------------------------------------------------------------------------

export const sampleData = {
  user: {
    email: "sample@example.com",
    password: "samplepassword123",
    name: "Sample User",
  },

  admin: {
    email: "sampleadmin@example.com",
    password: "adminpassword123",
    name: "Sample Admin",
    role: "admin",
  },

  ticket: {
    title: "Sample Ticket",
    description: "This is a sample ticket for testing",
    priority: "medium",
    category: "technical",
  },

  comment: {
    text: "This is a test comment",
  },
};

export const validators = {
  expectValidUser: user => {
    expect(user).toHaveProperty("_id");
    expect(user).toHaveProperty("email");
    expect(user).toHaveProperty("name");
    expect(user).toHaveProperty("role");
    expect(user).not.toHaveProperty("password");
  },

  expectValidTicket: ticket => {
    expect(ticket).toHaveProperty("_id");
    expect(ticket).toHaveProperty("title");
    expect(ticket).toHaveProperty("description");
    expect(ticket).toHaveProperty("status");
    expect(ticket).toHaveProperty("priority");
    expect(ticket).toHaveProperty("owner");
    expect(ticket).toHaveProperty("createdAt");
  },
};
