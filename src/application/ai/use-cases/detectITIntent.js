import { buildClassifierMessages } from "../generation/prompts.js";
import { assertLLMPort } from "../ports/LLMPort.js";
import {
  IT_KEYWORDS,
  evaluateITIntentHeuristics,
} from "../policy/aiPolicy.js";

const createDetectITIntentUseCase = ({ llmPort, logger, aiConfig }) => {
  const llm = assertLLMPort(llmPort);
  const log = logger || { warn: () => {} };
  const config = aiConfig || {};
  const domainGate = config.domainGate || {};

  return async ({ userMessage }) => {
    const heuristicDecision = evaluateITIntentHeuristics(userMessage, IT_KEYWORDS);
    if (typeof heuristicDecision === "boolean") {
      return heuristicDecision;
    }

    try {
      const cls = await llm.completeChat({
        model: domainGate.classifierModel,
        temperature: domainGate.classifierTemperature,
        maxTokens: domainGate.classifierMaxTokens,
        frequencyPenalty: 0,
        presencePenalty: 0,
        messages: buildClassifierMessages(userMessage),
      });

      const label = (cls.content || "").trim().toUpperCase();
      return label === "IT";
    } catch (error) {
      log.warn({ err: error }, "AI classifier fallback triggered");
      return true;
    }
  };
};

export { createDetectITIntentUseCase };

