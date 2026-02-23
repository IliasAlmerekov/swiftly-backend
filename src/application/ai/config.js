export const DEFAULT_AI_CONFIG = {
  model: "gpt-4o-mini",
  maxTokens: 220,
  temperature: 0.7,
  maxSolutionsInContext: 3,
  domainGate: {
    classifierModel: "gpt-4o-mini",
    classifierMaxTokens: 3,
    classifierTemperature: 0,
  },
};

