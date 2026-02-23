import {
  FUNCTION_RESPONSES,
  GREETING_RESPONSES,
  SYSTEM_PROMPTS,
  buildSolutionContext,
  buildSolutionPrompt,
} from "./prompts.js";

const getRandomResponse = (responses, lang) => {
  const langResponses = responses[lang] || responses.de;
  return langResponses[Math.floor(Math.random() * langResponses.length)];
};

const buildGenerationPlan = ({ flags, lang, solutions }) => {
  if (flags.isGreeting || flags.isFunctionQuestion) {
    return {
      responseType: "greeting_or_function",
      directResponse: flags.isFunctionQuestion
        ? getRandomResponse(FUNCTION_RESPONSES, lang)
        : getRandomResponse(GREETING_RESPONSES, lang),
      relatedSolutions: [],
      systemPrompt: null,
    };
  }

  if (flags.isLicenseRequest || flags.touchesProtectedData) {
    return {
      responseType: "license_request",
      directResponse: null,
      relatedSolutions: [],
      systemPrompt: SYSTEM_PROMPTS.license_request,
    };
  }

  if (flags.needsImmediateEscalation) {
    return {
      responseType: "escalation_required",
      directResponse: null,
      relatedSolutions: [],
      systemPrompt: SYSTEM_PROMPTS.escalation_required,
    };
  }

  if (solutions.length > 0) {
    const solutionsContext = buildSolutionContext(solutions);
    return {
      responseType: "solution_found",
      directResponse: null,
      relatedSolutions: solutions,
      systemPrompt: buildSolutionPrompt(solutionsContext),
    };
  }

  return {
    responseType: "no_solution_found",
    directResponse: null,
    relatedSolutions: [],
    systemPrompt: SYSTEM_PROMPTS.no_solution_found,
  };
};

const generateAssistantReply = async ({
  llmPort,
  model,
  maxTokens,
  temperature,
  systemPrompt,
  directResponse,
  userMessage,
  conversationHistory,
}) => {
  if (directResponse) {
    return {
      message: directResponse,
      tokensUsed: 0,
      usedDirectResponse: true,
    };
  }

  const limitedHistory = conversationHistory.slice(-6);
  const messages = [
    { role: "system", content: systemPrompt },
    ...limitedHistory,
    { role: "user", content: userMessage },
  ];

  const completion = await llmPort.completeChat({
    model,
    messages,
    maxTokens,
    temperature,
    frequencyPenalty: 0.2,
    presencePenalty: 0,
  });

  return {
    message: completion.content || "",
    tokensUsed: completion.totalTokens || 0,
    usedDirectResponse: false,
  };
};

export { buildGenerationPlan, generateAssistantReply };

