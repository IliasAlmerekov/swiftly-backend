import { jest } from "@jest/globals";
import { createGenerateAIResponseUseCase } from "../../../../../src/application/ai/use-cases/generateAIResponse.js";
import { buildGenerationPlan } from "../../../../../src/application/ai/generation/generateAssistantReply.js";

const aiConfig = {
  model: "gpt-4o-mini",
  maxTokens: 220,
  temperature: 0.7,
  maxSolutionsInContext: 3,
};

describe("createGenerateAIResponseUseCase", () => {
  test("returns out_of_scope when detectITIntent blocks the request", async () => {
    const useCase = createGenerateAIResponseUseCase({
      detectITIntent: jest.fn().mockResolvedValue(false),
      llmPort: { completeChat: jest.fn() },
      knowledgeBasePort: {
        logRequest: jest.fn().mockResolvedValue(undefined),
        searchSolutions: jest.fn().mockResolvedValue([]),
      },
      logger: { error: jest.fn(), warn: jest.fn() },
      aiConfig,
    });

    const response = await useCase({
      userMessage: "Wie wird das Wetter?",
      conversationHistory: [],
    });

    expect(response.type).toBe("out_of_scope");
    expect(response.shouldCreateTicket).toBe(false);
    expect(response.metadata).toMatchObject({ domainGate: "blocked" });
  });

  test("returns out_of_scope in english for english user message", async () => {
    const useCase = createGenerateAIResponseUseCase({
      detectITIntent: jest.fn().mockResolvedValue(false),
      llmPort: { completeChat: jest.fn() },
      knowledgeBasePort: {
        logRequest: jest.fn().mockResolvedValue(undefined),
        searchSolutions: jest.fn().mockResolvedValue([]),
      },
      logger: { error: jest.fn(), warn: jest.fn() },
      aiConfig,
    });

    const response = await useCase({
      userMessage: "Can you tell me a cooking recipe?",
      conversationHistory: [],
    });

    expect(response.type).toBe("out_of_scope");
    expect(response.message).toContain("I specialize in IT topics");
  });

  test("uses direct greeting response and skips llm completion", async () => {
    const llmPort = { completeChat: jest.fn() };
    const knowledgeBasePort = {
      logRequest: jest.fn().mockResolvedValue(undefined),
      searchSolutions: jest.fn().mockResolvedValue([]),
    };

    const useCase = createGenerateAIResponseUseCase({
      detectITIntent: jest.fn().mockResolvedValue(true),
      llmPort,
      knowledgeBasePort,
      logger: { error: jest.fn(), warn: jest.fn() },
      aiConfig,
    });

    const response = await useCase({
      userMessage: "Hallo",
      conversationHistory: [],
    });

    expect(response.type).toBe("greeting_or_function");
    expect(response.shouldCreateTicket).toBe(false);
    expect(response.metadata).toMatchObject({ usedDirectResponse: true });
    expect(llmPort.completeChat).not.toHaveBeenCalled();
    expect(knowledgeBasePort.searchSolutions).not.toHaveBeenCalled();
  });

  test("recommends ticket when no solution was found", async () => {
    const llmPort = {
      completeChat: jest.fn().mockResolvedValue({
        content: "Bitte senden Sie Logs.",
        totalTokens: 42,
      }),
    };

    const useCase = createGenerateAIResponseUseCase({
      detectITIntent: jest.fn().mockResolvedValue(true),
      llmPort,
      knowledgeBasePort: {
        logRequest: jest.fn().mockResolvedValue(undefined),
        searchSolutions: jest.fn().mockResolvedValue([]),
      },
      logger: { error: jest.fn(), warn: jest.fn() },
      aiConfig,
    });

    const response = await useCase({
      userMessage: "Mein Tool stürzt regelmäßig ab",
      conversationHistory: [],
    });

    expect(response.type).toBe("no_solution_found");
    expect(response.shouldCreateTicket).toBe(true);
    expect(response.metadata).toMatchObject({ tokensUsed: 42 });
  });

  test("returns localized technical error on generation failure", async () => {
    const useCase = createGenerateAIResponseUseCase({
      detectITIntent: jest.fn().mockResolvedValue(true),
      llmPort: {
        completeChat: jest.fn().mockRejectedValue(new Error("upstream failed")),
      },
      knowledgeBasePort: {
        logRequest: jest.fn().mockResolvedValue(undefined),
        searchSolutions: jest.fn().mockResolvedValue([]),
      },
      logger: { error: jest.fn(), warn: jest.fn() },
      aiConfig,
    });

    const response = await useCase({
      userMessage: "Hello, my VPN is not working",
      conversationHistory: [],
    });

    expect(response.type).toBe("error");
    expect(response.message).toContain("technical error");
    expect(response.shouldCreateTicket).toBe(true);
  });

  test("adds explicit language directive to system prompt", () => {
    const plan = buildGenerationPlan({
      flags: {
        isGreeting: false,
        isFunctionQuestion: false,
        isLicenseRequest: false,
        touchesProtectedData: false,
        needsImmediateEscalation: false,
      },
      lang: "en",
      solutions: [],
    });

    expect(plan.responseType).toBe("no_solution_found");
    expect(plan.systemPrompt).toContain("Respond exclusively in English.");
  });
});

