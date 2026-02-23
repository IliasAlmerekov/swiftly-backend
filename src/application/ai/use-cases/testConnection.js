import { assertLLMPort } from "../ports/LLMPort.js";

const createTestConnectionUseCase = ({ llmPort, aiConfig }) => {
  const llm = assertLLMPort(llmPort);
  const config = aiConfig || {};

  return async () => {
    try {
      const completion = await llm.completeChat({
        model: config.model,
        messages: [{ role: "user", content: "Hallo" }],
        maxTokens: 10,
        temperature: 0.2,
        frequencyPenalty: 0,
        presencePenalty: 0,
      });

      return {
        success: true,
        message: "OpenAI Verbindung erfolgreich",
        model: config.model,
        response: completion.content || "",
      };
    } catch (error) {
      return {
        success: false,
        message: "OpenAI Verbindung fehlgeschlagen",
        error: error.message,
      };
    }
  };
};

export { createTestConnectionUseCase };

