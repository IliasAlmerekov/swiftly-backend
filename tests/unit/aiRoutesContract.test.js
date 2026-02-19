import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

const mockGenerateResponse = jest.fn();
const mockAnalyzePriority = jest.fn();
const mockCategorizeIssue = jest.fn();
const mockIsConfigured = jest.fn();
const mockTestConnection = jest.fn();

jest.unstable_mockModule("../../src/services/aiService.js", () => ({
  default: {
    generateResponse: mockGenerateResponse,
    analyzePriority: mockAnalyzePriority,
    categorizeIssue: mockCategorizeIssue,
    isConfigured: mockIsConfigured,
    testConnection: mockTestConnection,
  },
}));

jest.unstable_mockModule("../../src/middlewares/authMiddleware.js", () => ({
  default: (req, _res, next) => {
    req.user = { _id: "507f1f77bcf86cd799439011" };
    next();
  },
}));

jest.unstable_mockModule("../../src/controllers/aiController.js", () => ({
  getAIRequestsStats: (_req, res) => res.status(200).json({ stats: [] }),
}));

jest.unstable_mockModule("../../src/config/redis.js", () => ({
  isRedisEnabled: false,
  getRedisClient: jest.fn(),
}));

const { default: aiRoutes } = await import("../../src/routes/aiRoutes.js");
const { notFound } = await import("../../src/middlewares/notFound.js");
const { errorHandler } = await import("../../src/middlewares/errorHandler.js");

const app = express();
app.use(express.json());
app.use("/api/ai", aiRoutes);
app.use(notFound);
app.use(errorHandler);

describe("ai routes error contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateResponse.mockResolvedValue({
      message: "ok",
      type: "greeting_or_function",
      shouldCreateTicket: false,
      relatedSolutions: [],
      metadata: {},
    });
    mockAnalyzePriority.mockResolvedValue("Medium");
    mockCategorizeIssue.mockResolvedValue("Software");
    mockIsConfigured.mockReturnValue(true);
    mockTestConnection.mockResolvedValue({ success: true });
  });

  test("returns centralized 400 error for invalid chat message", async () => {
    const response = await request(app).post("/api/ai/chat").send({ message: "" }).expect(400);

    expect(response.body).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Nachricht ist erforderlich",
    });
  });

  test("returns centralized 500 error when ai service throws", async () => {
    mockGenerateResponse.mockRejectedValue(new Error("boom"));

    const response = await request(app)
      .post("/api/ai/chat")
      .send({ message: "Hallo" })
      .expect(500);

    expect(response.body).toMatchObject({
      code: "INTERNAL_ERROR",
      message: "Internal Server Error",
    });
  });

  test("returns centralized 400 error for invalid analyze-priority message", async () => {
    const response = await request(app)
      .post("/api/ai/analyze-priority")
      .send({ message: 123 })
      .expect(400);

    expect(response.body).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Nachricht ist erforderlich",
    });
  });
});
