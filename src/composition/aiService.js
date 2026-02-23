import { DEFAULT_AI_CONFIG } from "../application/ai/config.js";
import { createAIUseCases } from "../application/ai/use-cases/index.js";
import OpenAILLMAdapter from "../infrastructure/ai/OpenAILLMAdapter.js";
import MongooseKnowledgeBaseAdapter from "../infrastructure/ai/MongooseKnowledgeBaseAdapter.js";
import { config } from "../config/env.js";
import AIRequestLog from "../models/aiLogs.js";
import Solution from "../models/solutionModel.js";
import AIServiceFacade from "../services/AIServiceFacade.js";
import logger from "../utils/logger.js";

const llmPort = new OpenAILLMAdapter({ apiKey: config.openaiApiKey });
const knowledgeBasePort = new MongooseKnowledgeBaseAdapter({
  SolutionModel: Solution,
  AIRequestLogModel: AIRequestLog,
  logger,
});

const useCases = createAIUseCases({
  llmPort,
  knowledgeBasePort,
  aiConfig: DEFAULT_AI_CONFIG,
  logger,
});

const aiService = new AIServiceFacade({
  useCases,
  knowledgeBasePort,
  isConfigured: () => Boolean(config.openaiApiKey),
});

export default aiService;
