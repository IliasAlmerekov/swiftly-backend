import {
  buildPolicyFlags,
  evaluateITIntentHeuristics,
  shouldCreateTicket,
} from "../../../../../src/application/ai/policy/aiPolicy.js";

describe("aiPolicy", () => {
  describe("evaluateITIntentHeuristics", () => {
    test("returns true for greeting intent", () => {
      expect(evaluateITIntentHeuristics("Hallo")).toBe(true);
    });

    test("returns false for obvious non-it request", () => {
      expect(evaluateITIntentHeuristics("Wie wird das Wetter heute?")).toBe(false);
    });

    test("returns true when message contains it keywords", () => {
      expect(
        evaluateITIntentHeuristics("VPN Verbindung fällt jede Stunde aus")
      ).toBe(true);
    });

    test("returns null for long ambiguous text without strong heuristics", () => {
      const message =
        "1234567890 1234567890 1234567890 1234567890 1234567890 1234567890";
      expect(evaluateITIntentHeuristics(message)).toBeNull();
    });
  });

  describe("shouldCreateTicket", () => {
    test("returns true for no_solution_found response type", () => {
      expect(
        shouldCreateTicket({
          responseType: "no_solution_found",
          aiResponse: "Kein Treffer",
          userMessage: "Outlook geht nicht",
          needsImmediateEscalation: false,
        })
      ).toBe(true);
    });

    test("returns false for greeting responses", () => {
      expect(
        shouldCreateTicket({
          responseType: "greeting_or_function",
          aiResponse: "Hallo!",
          userMessage: "Hallo",
          needsImmediateEscalation: false,
        })
      ).toBe(false);
    });

    test("returns true when user asks for human help", () => {
      expect(
        shouldCreateTicket({
          responseType: "solution_found",
          aiResponse: "Bitte diese Schritte ausführen",
          userMessage: "Ich brauche einen Techniker",
          needsImmediateEscalation: false,
        })
      ).toBe(true);
    });

    test("returns true for immediate escalation flag", () => {
      const flags = buildPolicyFlags("Bitte Ticket erstellen, ich brauche admin");
      expect(
        shouldCreateTicket({
          responseType: "solution_found",
          aiResponse: "Wir prüfen das",
          userMessage: "Bitte Ticket erstellen, ich brauche admin",
          needsImmediateEscalation: flags.needsImmediateEscalation,
        })
      ).toBe(true);
    });
  });
});
