import { jest } from "@jest/globals";
import { createDetectITIntentUseCase } from "../../../../../src/application/ai/use-cases/detectITIntent.js";

const aiConfig = {
  domainGate: {
    classifierModel: "gpt-4o-mini",
    classifierMaxTokens: 3,
    classifierTemperature: 0,
  },
};

describe("createDetectITIntentUseCase", () => {
  test("returns heuristic result without llm call when message is clearly it", async () => {
    const llmPort = {
      completeChat: jest.fn(),
    };

    const detectITIntent = createDetectITIntentUseCase({
      llmPort,
      aiConfig,
      logger: { warn: jest.fn() },
    });

    const result = await detectITIntent({
      userMessage: "VPN und DNS funktionieren nicht",
    });

    expect(result).toBe(true);
    expect(llmPort.completeChat).not.toHaveBeenCalled();
  });

  test("uses llm fallback for ambiguous intent", async () => {
    const llmPort = {
      completeChat: jest.fn().mockResolvedValue({ content: "NON-IT" }),
    };

    const detectITIntent = createDetectITIntentUseCase({
      llmPort,
      aiConfig,
      logger: { warn: jest.fn() },
    });

    const result = await detectITIntent({
      userMessage:
        "1234567890 1234567890 1234567890 1234567890 1234567890 1234567890",
    });

    expect(result).toBe(false);
    expect(llmPort.completeChat).toHaveBeenCalledTimes(1);
  });

  test("falls back to true when llm classifier throws", async () => {
    const warn = jest.fn();
    const llmPort = {
      completeChat: jest.fn().mockRejectedValue(new Error("timeout")),
    };

    const detectITIntent = createDetectITIntentUseCase({
      llmPort,
      aiConfig,
      logger: { warn },
    });

    const result = await detectITIntent({
      userMessage:
        "1234567890 1234567890 1234567890 1234567890 1234567890 1234567890",
    });

    expect(result).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
