import { assertLLMPort } from "../ports/LLMPort.js";

const PRIORITY_SYSTEM_PROMPT = `Analysiere die Priorität dieses Problems basierend auf:
- Auswirkung auf die Arbeit (Low/Medium/High)
- Dringlichkeit (Low/Medium/High)
- Anzahl betroffener Benutzer

Kategorien:
- Low: Kleine Probleme, keine Arbeitsunterbrechung
- Medium: Moderate Probleme, teilweise Arbeitsunterbrechung
- High: Kritische Probleme, schwere Arbeitsunterbrechung, Systemausfall

Antworte nur mit: Low, Medium oder High`;

const createAnalyzePriorityUseCase = ({ llmPort, aiConfig, logger }) => {
  const llm = assertLLMPort(llmPort);
  const config = aiConfig || {};
  const log = logger || { error: () => {} };

  return async ({ message }) => {
    try {
      const completion = await llm.completeChat({
        model: config.model,
        temperature: 0.3,
        maxTokens: 10,
        frequencyPenalty: 0,
        presencePenalty: 0,
        messages: [
          {
            role: "system",
            content: PRIORITY_SYSTEM_PROMPT,
          },
          { role: "user", content: message },
        ],
      });

      const out = (completion.content || "").trim();
      return ["Low", "Medium", "High"].includes(out) ? out : "Medium";
    } catch (error) {
      log.error({ err: error }, "AI priority analysis failed");
      return "Medium";
    }
  };
};

export { createAnalyzePriorityUseCase };

