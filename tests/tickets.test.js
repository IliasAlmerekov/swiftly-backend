// TICKET TESTS - These test ticket creation, viewing, and management
//
// What are we testing?
// - Can users create tickets?
// - Can users view their own tickets?
// - Can admins view all tickets?
// - What happens when unauthorized users try to access tickets?

import request from "supertest";
import app from "./app.js";
import User from "../src/models/userModel.js";

describe("Ticket Tests", () => {
  // Helper function to create a user and get their token
  const createUserAndGetToken = async userData => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(userData)
      .expect(201);

    return {
      token: response.body.token,
      userId: response.body.userId,
    };
  };

  const createAdminAndGetToken = async () => {
    const adminData = {
      email: "admin@example.com",
      password: "password123",
      name: "Admin User",
      role: "admin",
    };

    await User.create(adminData);

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: adminData.email, password: adminData.password })
      .expect(200);

    return {
      token: response.body.token,
      userId: response.body.userId,
    };
  };

  test("should create a new ticket for authenticated user", async () => {
    const { token } = await createUserAndGetToken({
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

    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send(ticketData)
      .expect(201);

    expect(response.body).toHaveProperty("title", ticketData.title);
    expect(response.body).toHaveProperty("description", ticketData.description);
    expect(response.body).toHaveProperty("priority", ticketData.priority);
    expect(response.body).toHaveProperty("status", "open");
  });

  test("should not create ticket without authentication", async () => {
    const ticketData = {
      title: "Unauthorized Ticket",
      description: "This should fail",
      priority: "low",
    };

    const response = await request(app)
      .post("/api/tickets")
      .send(ticketData)
      .expect(401);

    expect(response.body).toHaveProperty("message");
  });

  test("should get user tickets for authenticated user", async () => {
    const { token } = await createUserAndGetToken({
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

    await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send(ticket1)
      .expect(201);

    await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send(ticket2)
      .expect(201);

    const response = await request(app)
      .get("/api/tickets?scope=mine")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

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
    const { token } = await createUserAndGetToken({
      email: "cursoruser@example.com",
      password: "password123",
      name: "Cursor User",
    });

    await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Ticket 1", description: "Desc 1", priority: "low" })
      .expect(201);

    await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Ticket 2", description: "Desc 2", priority: "medium" })
      .expect(201);

    await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Ticket 3", description: "Desc 3", priority: "high" })
      .expect(201);

    const firstPage = await request(app)
      .get("/api/tickets?scope=mine&limit=2")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(firstPage.body.items).toHaveLength(2);
    expect(firstPage.body.pageInfo).toHaveProperty("hasNextPage", true);
    expect(typeof firstPage.body.pageInfo.nextCursor).toBe("string");

    const secondPage = await request(app)
      .get(
        `/api/tickets?scope=mine&limit=2&cursor=${encodeURIComponent(
          firstPage.body.pageInfo.nextCursor
        )}`
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(secondPage.body.items).toHaveLength(1);
    expect(secondPage.body.pageInfo).toHaveProperty("hasNextPage", false);
  });

  test("should get all tickets for admin user", async () => {
    const regularUser = await createUserAndGetToken({
      email: "regular@example.com",
      password: "password123",
      name: "Regular User",
    });

    const adminUser = await createAdminAndGetToken();

    await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${regularUser.token}`)
      .send({
        title: "Regular User Ticket",
        description: "From regular user",
        priority: "medium",
      })
      .expect(201);

    const response = await request(app)
      .get("/api/tickets?scope=all")
      .set("Authorization", `Bearer ${adminUser.token}`)
      .expect(200);

    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items.length).toBeGreaterThan(0);
    expect(response.body.pageInfo).toHaveProperty("limit");
  });

  test("should not allow regular user to access admin endpoints", async () => {
    const { token } = await createUserAndGetToken({
      email: "nonadmin@example.com",
      password: "password123",
      name: "Non Admin User",
    });

    const response = await request(app)
      .get("/api/tickets?scope=all")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toContain("Access denied");
  });

  test("should not create ticket with missing required fields", async () => {
    const { token } = await createUserAndGetToken({
      email: "missingfields@example.com",
      password: "password123",
      name: "Missing Fields User",
    });

    const incompleteTicket = {
      description: "Missing title",
      priority: "low",
    };

    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send(incompleteTicket)
      .expect(400);

    expect(response.body).toHaveProperty("message");
  });
});
