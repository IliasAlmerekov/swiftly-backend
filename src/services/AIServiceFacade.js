import {
  countHits,
  detectLang,
  matchAny,
  shouldRecommendTicket,
} from "../application/ai/policy/aiPolicy.js";

class AIServiceFacade {
  constructor({ useCases, knowledgeBasePort, isConfigured }) {
    this.useCases = useCases;
    this.knowledgeBasePort = knowledgeBasePort;
    this.isConfiguredFn = isConfigured;
  }

  detectLang(text) {
    return detectLang(text);
  }

  async isITIntent(userMessage, conversationHistory = []) {
    return this.useCases.detectITIntent({
      userMessage,
      conversationHistory,
    });
  }

  async searchSolutions(query, limit = 5) {
    return this.knowledgeBasePort.searchSolutions({ query, limit });
  }

  async generateResponse(userMessage, conversationHistory = [], summary = "") {
    return this.useCases.generateAIResponse({
      userMessage,
      conversationHistory,
      summary,
    });
  }

  async analyzePriority(message) {
    return this.useCases.analyzePriority({ message });
  }

  async categorizeIssue(message) {
    return this.useCases.categorizeIssue({ message });
  }

  shouldRecommendTicket(aiResponse, userMessage) {
    return shouldRecommendTicket(aiResponse, userMessage);
  }

  isConfigured() {
    return this.isConfiguredFn();
  }

  async testConnection() {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: "OpenAI Verbindung fehlgeschlagen",
        error: "OpenAI API Key nicht konfiguriert",
      };
    }

    return this.useCases.testConnection();
  }
}

export default AIServiceFacade;
export {
  detectLang as _detectLang,
  matchAny as _matchAny,
  countHits as _countHits,
};
