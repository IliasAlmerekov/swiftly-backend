import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";
import { readFile } from "node:fs/promises";
import { createTicketController } from "../../src/controllers/ticketController.js";
import { createTicketRoutes } from "../../src/routes/ticketRoutes.js";
import { notFound } from "../../src/middlewares/notFound.js";
import { errorHandler } from "../../src/middlewares/errorHandler.js";

const mockListTickets = jest.fn();
const mockGetTicketById = jest.fn();
const mockAddComment = jest.fn();
const mockCreateTicket = jest.fn();
const mockUpdateTicket = jest.fn();
const mockTriageTicket = jest.fn();
const mockUploadAttachment = jest.fn();
const mockGetTicketStats = jest.fn();
const mockGetUserTicketStats = jest.fn();
const mockGetTicketsToday = jest.fn();

const ticketService = {
  listTickets: mockListTickets,
  getTicketById: mockGetTicketById,
  addComment: mockAddComment,
  createTicket: mockCreateTicket,
  updateTicket: mockUpdateTicket,
  triageTicket: mockTriageTicket,
  uploadAttachment: mockUploadAttachment,
  getTicketStats: mockGetTicketStats,
  getUserTicketStats: mockGetUserTicketStats,
  getTicketsToday: mockGetTicketsToday,
};

const authMiddleware = (req, _res, next) => {
  req.user = { _id: "507f1f77bcf86cd799439011", role: "admin" };
  next();
};

const ticketController = createTicketController({ ticketService });
const ticketRoutes = createTicketRoutes({ ticketController, authMiddleware });

const app = express();
app.use(express.json());
app.use("/api/tickets", ticketRoutes);
app.use(notFound);
app.use(errorHandler);

describe("ticket routes contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListTickets.mockResolvedValue({ nodes: [], pageInfo: { hasNextPage: false } });
    mockCreateTicket.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
      title: "Contract ticket",
      description: "Contract body",
    });
    mockGetTicketById.mockResolvedValue({});
    mockAddComment.mockResolvedValue({});
    mockUpdateTicket.mockResolvedValue({});
    mockTriageTicket.mockResolvedValue({});
    mockUploadAttachment.mockResolvedValue([]);
    mockGetTicketStats.mockResolvedValue({});
    mockGetUserTicketStats.mockResolvedValue({});
    mockGetTicketsToday.mockResolvedValue(0);
  });

  test("returns expected ticket payload shape on create", async () => {
    const response = await request(app).post("/api/tickets").send({
      title: "Printer offline",
      description: "Cannot print from floor 3",
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      _id: "507f1f77bcf86cd799439012",
      title: "Contract ticket",
      description: "Contract body",
    });
  });

  test("returns centralized 400 validation error for invalid create payload", async () => {
    const response = await request(app).post("/api/tickets").send({
      title: "",
      description: "",
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  test("returns centralized 500 error when ticket service throws", async () => {
    mockListTickets.mockRejectedValueOnce(new Error("boom"));

    const response = await request(app).get("/api/tickets");

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      code: "INTERNAL_ERROR",
      message: "Internal Server Error",
    });
  });

  test("returns centralized 400 validation error for invalid ticket list query", async () => {
    const response = await request(app).get("/api/tickets?limit=0");

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  test("does not read configuration from process.env in ticket routes", async () => {
    const source = await readFile("src/routes/ticketRoutes.js", "utf8");

    expect(source).not.toMatch(/\bprocess\.env\b/);
  });
});
