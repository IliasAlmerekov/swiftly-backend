import { buildGenerationPlan, generateAssistantReply } from "../generation/generateAssistantReply.js";
import { assertKnowledgeBasePort } from "../ports/KnowledgeBasePort.js";
import { assertLLMPort } from "../ports/LLMPort.js";
import {
  buildPolicyFlags,
  detectLang,
  getOutOfScopeMessage,
  getSensitiveBlockedMessage,
  sanitizePromptForLog,
  shouldBlockSensitiveResponse,
  shouldCreateTicket,
  shouldSearchSolutions,
} from "../policy/aiPolicy.js";

const createGenerateAIResponseUseCase = ({
  knowledgeBasePort,
  detectITIntent,
  llmPort,
  logger,
  aiConfig,
}) => {
  const knowledgeBase = assertKnowledgeBasePort(knowledgeBasePort);
  const llm = assertLLMPort(llmPort);
  const log = logger || { error: () => {}, warn: () => {} };
  const config = aiConfig || {};

  return async ({ userMessage, conversationHistory = [] }) => {
    try {
      try {
        await knowledgeBase.logRequest({
          prompt: sanitizePromptForLog(userMessage),
        });
      } catch (error) {
        log.warn({ err: error }, "AI request log failed");
      }

      const isIT = await detectITIntent({ userMessage });
      if (!isIT) {
        const lang = detectLang(userMessage);
        return {
          type: "out_of_scope",
          message: getOutOfScopeMessage(lang),
          shouldCreateTicket: false,
          metadata: { domainGate: "blocked" },
        };
      }

      const lang = detectLang(userMessage);
      const flags = buildPolicyFlags(userMessage);

      let solutions = [];
      if (shouldSearchSolutions(flags)) {
        solutions = await knowledgeBase.searchSolutions({
          query: userMessage,
          limit: config.maxSolutionsInContext,
        });
      }

      const generationPlan = buildGenerationPlan({
        flags,
        lang,
        solutions,
      });

      const reply = await generateAssistantReply({
        llmPort: llm,
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        systemPrompt: generationPlan.systemPrompt,
        directResponse: generationPlan.directResponse,
        userMessage,
        conversationHistory,
      });

      if (
        shouldBlockSensitiveResponse({
          aiResponse: reply.message,
          flags,
        })
      ) {
        return {
          type: "escalation_required",
          message: getSensitiveBlockedMessage(lang),
          relatedSolutions: generationPlan.relatedSolutions,
          shouldCreateTicket: true,
          metadata: {
            tokensUsed: reply.tokensUsed,
            model: config.model,
            solutionsFound: solutions.length,
            usedDirectResponse: false,
            safety: "blocked_sensitive_response",
          },
        };
      }

      return {
        type: generationPlan.responseType,
        message: reply.message,
        relatedSolutions: generationPlan.relatedSolutions,
        shouldCreateTicket: shouldCreateTicket({
          responseType: generationPlan.responseType,
          aiResponse: reply.message,
          userMessage,
          needsImmediateEscalation: flags.needsImmediateEscalation,
        }),
        metadata: {
          tokensUsed: reply.tokensUsed,
          model: config.model,
          solutionsFound: solutions.length,
          usedDirectResponse: reply.usedDirectResponse,
        },
      };
    } catch (error) {
      log.error({ err: error }, "AI response generation failed");
      return {
        type: "error",
        message:
          "Entschuldigung, es gab einen technischen Fehler. Bitte versuchen Sie es erneut oder erstellen Sie ein Support-Ticket für weitere Hilfe.",
        shouldCreateTicket: true,
        metadata: { error: error.message },
      };
    }
  };
};

export { createGenerateAIResponseUseCase };
