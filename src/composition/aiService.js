import { DEFAULT_AI_CONFIG } from "../application/ai/config.js";
import { createAIUseCases } from "../application/ai/use-cases/index.js";
import OpenAILLMAdapter from "../infrastructure/ai/OpenAILLMAdapter.js";
import MongooseKnowledgeBaseAdapter from "../infrastructure/ai/MongooseKnowledgeBaseAdapter.js";
import AIServiceFacade from "../services/AIServiceFacade.js";

export const createAIService = ({
  apiKey,
  aiRequestLogModel,
  solutionModel,
  logger,
  aiConfig = DEFAULT_AI_CONFIG,
}) => {
  const llmPort = new OpenAILLMAdapter({ apiKey });
  const knowledgeBasePort = new MongooseKnowledgeBaseAdapter({
    SolutionModel: solutionModel,
    AIRequestLogModel: aiRequestLogModel,
    logger,
  });

  const useCases = createAIUseCases({
    llmPort,
    knowledgeBasePort,
    aiConfig,
    logger,
  });

  return new AIServiceFacade({
    useCases,
    knowledgeBasePort,
    isConfigured: () => Boolean(apiKey),
  });
};
