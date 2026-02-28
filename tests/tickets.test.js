import request from "supertest";
import app from "./app.js";
import User from "../src/models/userModel.js";

const getCookieByPrefix = (cookies = [], prefix) =>
  cookies.find(cookie => cookie.startsWith(prefix));

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

describe("Ticket Tests", () => {
  const createUserSession = async userData => {
    const agent = request.agent(app);
    const csrfToken = await bootstrapCsrf(agent);

    await agent
      .post("/api/auth/register")
      .set("X-CSRF-Token", csrfToken)
      .send(userData)
      .expect(201);

    return { agent, csrfToken };
  };

  const createAdminSession = async () => {
    const adminData = {
      email: "admin@example.com",
      password: "password123",
      name: "Admin User",
      role: "admin",
    };

    await User.create(adminData);

    const agent = request.agent(app);
    const csrfToken = await bootstrapCsrf(agent);

    await agent
      .post("/api/auth/login")
      .set("X-CSRF-Token", csrfToken)
      .send({ email: adminData.email, password: adminData.password })
      .expect(200);

    return { agent, csrfToken };
  };

  test("should create a new ticket for authenticated user", async () => {
    const { agent, csrfToken } = await createUserSession({
      email: "ticketuser@example.com",
      password: "password123",
      name: "Ticket User",
    });

    const ticketData = {
      title: "Test Ticket",
      description: "This is a test ticket description",
      priority: "medium",
      category: "technical",
    };

    const response = await agent
      .post("/api/tickets")
      .set("X-CSRF-Token", csrfToken)
      .send(ticketData)
      .expect(201);

    expect(response.body).toHaveProperty("title", ticketData.title);
    expect(response.body).toHaveProperty("description", ticketData.description);
    expect(response.body).toHaveProperty("priority", ticketData.priority);
    expect(response.body).toHaveProperty("status", "open");
  });

  test("should not create ticket without authentication", async () => {
    const agent = request.agent(app);
    const csrfToken = await bootstrapCsrf(agent);
    const ticketData = {
      title: "Unauthorized Ticket",
      description: "This should fail",
      priority: "low",
    };

    const response = await agent
      .post("/api/tickets")
      .set("X-CSRF-Token", csrfToken)
      .send(ticketData)
      .expect(401);

    expect(response.body).toHaveProperty("message");
  });

  test("should get user tickets for authenticated user", async () => {
    const { agent, csrfToken } = await createUserSession({
      email: "viewtickets@example.com",
      password: "password123",
      name: "View Tickets User",
    });

    const ticket1 = {
      title: "First Ticket",
      description: "First description",
      priority: "high",
    };

    const ticket2 = {
      title: "Second Ticket",
      description: "Second description",
      priority: "low",
    };

    await agent
      .post("/api/tickets")
      .set("X-CSRF-Token", csrfToken)
      .send(ticket1)
      .expect(201);

    await agent
      .post("/api/tickets")
      .set("X-CSRF-Token", csrfToken)
      .send(ticket2)
      .expect(201);

    const response = await agent.get("/api/tickets?scope=mine").expect(200);

    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.pageInfo).toHaveProperty("limit");
    expect(response.body.pageInfo).toHaveProperty("hasNextPage", false);
    expect(response.body.pageInfo).toHaveProperty("nextCursor", null);

    const titles = response.body.items.map(ticket => ticket.title);
    expect(titles).toContain("First Ticket");
    expect(titles).toContain("Second Ticket");
  });

  test("should paginate user tickets with cursor", async () => {
    const { agent, csrfToken } = await createUserSession({
      email: "cursoruser@example.com",
      password: "password123",
      name: "Cursor User",
    });

    await agent
      .post("/api/tickets")
      .set("X-CSRF-Token", csrfToken)
      .send({ title: "Ticket 1", description: "Desc 1", priority: "low" })
      .expect(201);

    await agent
      .post("/api/tickets")
      .set("X-CSRF-Token", csrfToken)
      .send({ title: "Ticket 2", description: "Desc 2", priority: "medium" })
      .expect(201);

    await agent
      .post("/api/tickets")
      .set("X-CSRF-Token", csrfToken)
      .send({ title: "Ticket 3", description: "Desc 3", priority: "high" })
      .expect(201);

    const firstPage = await agent.get("/api/tickets?scope=mine&limit=2").expect(200);

    expect(firstPage.body.items).toHaveLength(2);
    expect(firstPage.body.pageInfo).toHaveProperty("hasNextPage", true);
    expect(typeof firstPage.body.pageInfo.nextCursor).toBe("string");

    const secondPage = await agent
      .get(
        `/api/tickets?scope=mine&limit=2&cursor=${encodeURIComponent(
          firstPage.body.pageInfo.nextCursor
        )}`
      )
      .expect(200);

    expect(secondPage.body.items).toHaveLength(1);
    expect(secondPage.body.pageInfo).toHaveProperty("hasNextPage", false);
  });

  test("should get all tickets for admin user", async () => {
    const regularUser = await createUserSession({
      email: "regular@example.com",
      password: "password123",
      name: "Regular User",
    });

    const adminUser = await createAdminSession();

    await regularUser.agent
      .post("/api/tickets")
      .set("X-CSRF-Token", regularUser.csrfToken)
      .send({
        title: "Regular User Ticket",
        description: "From regular user",
        priority: "medium",
      })
      .expect(201);

    const response = await adminUser.agent.get("/api/tickets?scope=all").expect(200);

    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items.length).toBeGreaterThan(0);
    expect(response.body.pageInfo).toHaveProperty("limit");
  });

  test("should not allow regular user to access admin endpoints", async () => {
    const { agent } = await createUserSession({
      email: "nonadmin@example.com",
      password: "password123",
      name: "Non Admin User",
    });

    const response = await agent.get("/api/tickets?scope=all").expect(403);

    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toContain("Access denied");
  });

  test("should not create ticket with missing required fields", async () => {
    const { agent, csrfToken } = await createUserSession({
      email: "missingfields@example.com",
      password: "password123",
      name: "Missing Fields User",
    });

    const incompleteTicket = {
      description: "Missing title",
      priority: "low",
    };

    const response = await agent
      .post("/api/tickets")
      .set("X-CSRF-Token", csrfToken)
      .send(incompleteTicket)
      .expect(400);

    expect(response.body).toHaveProperty("message");
  });

  test("should reject ticket create without csrf token", async () => {
    const { agent } = await createUserSession({
      email: "missing-csrf-ticket@example.com",
      password: "password123",
      name: "Missing Csrf Ticket User",
    });

    await agent
      .post("/api/tickets")
      .send({
        title: "No CSRF Ticket",
        description: "Expected csrf failure",
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
