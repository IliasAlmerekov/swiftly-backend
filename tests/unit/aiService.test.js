import { jest } from "@jest/globals";

const mockCreateCompletion = jest.fn();
const mockAIRequestLogCreate = jest.fn();

jest.unstable_mockModule("openai", () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreateCompletion,
      },
    },
  })),
}));

jest.unstable_mockModule("../../src/models/aiLogs.js", () => ({
  default: {
    create: mockAIRequestLogCreate,
  },
}));

jest.unstable_mockModule("../../src/models/solutionModel.js", () => ({
  default: {
    find: jest.fn(),
  },
}));

jest.unstable_mockModule("../../src/utils/logger.js", () => ({
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const { default: aiService } = await import("../../src/services/aiService.js");

describe("aiService", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockCreateCompletion.mockReset();
    mockAIRequestLogCreate.mockReset();
    mockAIRequestLogCreate.mockResolvedValue({});
  });

  test("returns out_of_scope when domain gate blocks non-IT intent", async () => {
    jest.spyOn(aiService, "isITIntent").mockResolvedValue(false);

    const response = await aiService.generateResponse("Wie wird das Wetter?");

    expect(response.type).toBe("out_of_scope");
    expect(response.shouldCreateTicket).toBe(false);
    expect(response.metadata).toMatchObject({ domainGate: "blocked" });
    expect(mockCreateCompletion).not.toHaveBeenCalled();
  });

  test("uses direct greeting response without OpenAI call", async () => {
    jest.spyOn(aiService, "isITIntent").mockResolvedValue(true);
    const searchSpy = jest.spyOn(aiService, "searchSolutions");

    const response = await aiService.generateResponse("Hallo");

    expect(response.type).toBe("greeting_or_function");
    expect(response.shouldCreateTicket).toBe(false);
    expect(response.metadata).toMatchObject({ usedDirectResponse: true });
    expect(searchSpy).not.toHaveBeenCalled();
    expect(mockCreateCompletion).not.toHaveBeenCalled();
  });

  test("falls back to safe error contract when OpenAI generation fails", async () => {
    jest.spyOn(aiService, "isITIntent").mockResolvedValue(true);
    jest.spyOn(aiService, "searchSolutions").mockResolvedValue([]);
    mockCreateCompletion.mockRejectedValue(new Error("OpenAI down"));

    const response = await aiService.generateResponse(
      "Mein Drucker zeigt einen Fehlercode E17"
    );

    expect(response.type).toBe("error");
    expect(response.shouldCreateTicket).toBe(true);
    expect(response.metadata).toMatchObject({ error: "OpenAI down" });
  });

  test("analyzePriority returns model result when label is valid", async () => {
    mockCreateCompletion.mockResolvedValue({
      choices: [{ message: { content: "High" } }],
    });

    const result = await aiService.analyzePriority("Systemausfall im Büro");

    expect(result).toBe("High");
  });

  test("analyzePriority falls back to Medium for invalid label", async () => {
    mockCreateCompletion.mockResolvedValue({
      choices: [{ message: { content: "Urgent" } }],
    });

    const result = await aiService.analyzePriority("Outlook langsam");

    expect(result).toBe("Medium");
  });

  test("categorizeIssue returns model category when valid", async () => {
    mockCreateCompletion.mockResolvedValue({
      choices: [{ message: { content: "Netzwerk" } }],
    });

    const result = await aiService.categorizeIssue("VPN Verbindung bricht ab");

    expect(result).toBe("Netzwerk");
  });

  test("categorizeIssue falls back to Sonstiges on OpenAI error", async () => {
    mockCreateCompletion.mockRejectedValue(new Error("timeout"));

    const result = await aiService.categorizeIssue("Unbekanntes Verhalten");

    expect(result).toBe("Sonstiges");
  });
});
