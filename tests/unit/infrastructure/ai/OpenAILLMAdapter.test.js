import { jest } from "@jest/globals";
import OpenAILLMAdapter from "../../../../src/infrastructure/ai/OpenAILLMAdapter.js";

describe("OpenAILLMAdapter", () => {
  test("does not throw during construction when api key is missing", () => {
    expect(() => new OpenAILLMAdapter()).not.toThrow();
  });

  test("throws a clear error when called without api key", async () => {
    const adapter = new OpenAILLMAdapter();

    await expect(
      adapter.completeChat({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "hello" }],
        maxTokens: 10,
      })
    ).rejects.toThrow("OpenAI API key is not configured");
  });

  test("maps completion response from injected client", async () => {
    const create = jest.fn().mockResolvedValue({
      choices: [{ message: { content: "Antwort" } }],
      usage: { total_tokens: 42 },
    });
    const client = {
      chat: {
        completions: {
          create,
        },
      },
    };

    const adapter = new OpenAILLMAdapter({ client });

    const response = await adapter.completeChat({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hello" }],
      maxTokens: 50,
      temperature: 0.3,
      frequencyPenalty: 0.1,
      presencePenalty: 0.2,
    });

    expect(create).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hello" }],
      max_tokens: 50,
      temperature: 0.3,
      frequency_penalty: 0.1,
      presence_penalty: 0.2,
    });
    expect(response).toEqual({
      content: "Antwort",
      totalTokens: 42,
    });
  });
});
