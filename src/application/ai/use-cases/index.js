import { createAnalyzePriorityUseCase } from "./analyzePriority.js";
import { createCategorizeIssueUseCase } from "./categorizeIssue.js";
import { createDetectITIntentUseCase } from "./detectITIntent.js";
import { createGenerateAIResponseUseCase } from "./generateAIResponse.js";
import { createTestConnectionUseCase } from "./testConnection.js";

const createAIUseCases = ({ llmPort, knowledgeBasePort, aiConfig, logger }) => {
  const detectITIntent = createDetectITIntentUseCase({
    llmPort,
    logger,
    aiConfig,
  });

  return {
    detectITIntent,
    generateAIResponse: createGenerateAIResponseUseCase({
      knowledgeBasePort,
      detectITIntent,
      llmPort,
      logger,
      aiConfig,
    }),
    analyzePriority: createAnalyzePriorityUseCase({ llmPort, aiConfig, logger }),
    categorizeIssue: createCategorizeIssueUseCase({ llmPort, aiConfig, logger }),
    testConnection: createTestConnectionUseCase({ llmPort, aiConfig }),
  };
};

export { createAIUseCases };

