import { assertLLMPort } from "../ports/LLMPort.js";

const CATEGORY_SYSTEM_PROMPT = `Kategorisiere dieses Problem in eine der folgenden Kategorien:
- Hardware: Physische Geräte, Computer, Drucker, etc.
- Software: Programme, Apps, Betriebssysteme
- Netzwerk: Internet, WLAN, Verbindungsprobleme
- Account: Login-Probleme, Passwörter, Benutzerkonten
- Email: E-Mail-Probleme, Outlook, etc.
- Sonstiges: Alles andere

Antworte nur mit der Kategorie.`;

const VALID_CATEGORIES = [
  "Hardware",
  "Software",
  "Netzwerk",
  "Account",
  "Email",
  "Sonstiges",
];

const createCategorizeIssueUseCase = ({ llmPort, aiConfig, logger }) => {
  const llm = assertLLMPort(llmPort);
  const config = aiConfig || {};
  const log = logger || { error: () => {} };

  return async ({ message }) => {
    try {
      const completion = await llm.completeChat({
        model: config.model,
        temperature: 0.2,
        maxTokens: 10,
        frequencyPenalty: 0,
        presencePenalty: 0,
        messages: [
          {
            role: "system",
            content: CATEGORY_SYSTEM_PROMPT,
          },
          { role: "user", content: message },
        ],
      });

      const out = (completion.content || "").trim();
      return VALID_CATEGORIES.includes(out) ? out : "Sonstiges";
    } catch (error) {
      log.error({ err: error }, "AI categorization failed");
      return "Sonstiges";
    }
  };
};

export { createCategorizeIssueUseCase };

