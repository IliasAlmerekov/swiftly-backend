import { jest } from "@jest/globals";
import AIServiceFacade from "../../src/services/AIServiceFacade.js";

describe("AIServiceFacade", () => {
  const createService = () => {
    const useCases = {
      detectITIntent: jest.fn().mockResolvedValue(true),
      generateAIResponse: jest.fn().mockResolvedValue({ type: "ok" }),
      analyzePriority: jest.fn().mockResolvedValue("Medium"),
      categorizeIssue: jest.fn().mockResolvedValue("Software"),
      testConnection: jest.fn().mockResolvedValue({ success: true }),
    };

    const knowledgeBasePort = {
      searchSolutions: jest.fn().mockResolvedValue([]),
    };

    const service = new AIServiceFacade({
      useCases,
      knowledgeBasePort,
      isConfigured: () => true,
    });

    return { service, useCases, knowledgeBasePort };
  };

  test("delegates generateResponse to use-case", async () => {
    const { service, useCases } = createService();

    await service.generateResponse("Hallo", [{ role: "user", content: "Hallo" }]);

    expect(useCases.generateAIResponse).toHaveBeenCalledWith({
      userMessage: "Hallo",
      conversationHistory: [{ role: "user", content: "Hallo" }],
      summary: "",
    });
  });

  test("delegates searchSolutions to knowledge base port", async () => {
    const { service, knowledgeBasePort } = createService();

    await service.searchSolutions("VPN Problem", 3);

    expect(knowledgeBasePort.searchSolutions).toHaveBeenCalledWith({
      query: "VPN Problem",
      limit: 3,
    });
  });

  test("returns configuration error in testConnection when api key is missing", async () => {
    const useCases = {
      testConnection: jest.fn(),
    };
    const service = new AIServiceFacade({
      useCases,
      knowledgeBasePort: { searchSolutions: jest.fn() },
      isConfigured: () => false,
    });

    const result = await service.testConnection();

    expect(result).toMatchObject({
      success: false,
      message: "OpenAI Verbindung fehlgeschlagen",
      error: "OpenAI API Key nicht konfiguriert",
    });
    expect(useCases.testConnection).not.toHaveBeenCalled();
  });
});

