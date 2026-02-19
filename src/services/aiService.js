// src/services/AIService.js
import OpenAI from "openai";
import AIRequestLog from "../models/aiLogs.js";
import Solution from "../models/solutionModel.js";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";
import {
  GREETING_RESPONSES,
  FUNCTION_RESPONSES,
  SYSTEM_PROMPTS,
  buildSolutionContext,
  buildClassifierMessages,
  buildSolutionPrompt,
} from "./ai/prompts.js";

/** ---------------------- Konstante Konfiguration & Muster ------------------- */
const DEFAULT_CONFIG = {
  model: "gpt-4o-mini",
  maxTokens: 220,
  temperature: 0.7,
  maxSolutionsInContext: 3,
  domainGate: {
    minKeywordHits: 2,
    classifierModel: "gpt-4o-mini",
    classifierMaxTokens: 3,
    classifierTemperature: 0,
  },
};

const SELECT_FIELDS = "title problem solution category priority keywords";
const DEFAULT_SORT = { updatedAt: -1 };
const TEXT_SORT = { score: { $meta: "textScore" }, updatedAt: -1 };

const IT_KEYWORDS = [
  // Infrastruktur/Netz
  "netzwerk",
  "vpn",
  "ip",
  "dns",
  "dhcp",
  "gateway",
  "latency",
  "bandwidth",
  "ping",
  "wlan",
  "lan",
  "proxy",
  "firewall",
  // Systeme/OS
  "windows",
  "macos",
  "linux",
  "ubuntu",
  "debian",
  "red hat",
  "kernel",
  "driver",
  "treiber",
  "update",
  "patch",
  // Security/Identity
  "mfa",
  "2fa",
  "sso",
  "oauth",
  "saml",
  "azure ad",
  "encryption",
  "tls",
  "ssl",
  "zertifikat",
  "token",
  "jwt",
  "secrets",
  // Software/Apps
  "outlook",
  "office",
  "excel",
  "teams",
  "slack",
  "jira",
  "confluence",
  "sap",
  "vs code",
  "ide",
  "browser",
  "chrome",
  "edge",
  "firefox",
  // Dev/DevOps
  "git",
  "github",
  "gitlab",
  "branch",
  "merge",
  "pipeline",
  "ci",
  "cd",
  "docker",
  "kubernetes",
  "helm",
  "terraform",
  "ansible",
  "node",
  "npm",
  "pnpm",
  "yarn",
  "react",
  "vite",
  "astro",
  "express",
  "mongodb",
  "mongoose",
  "postgres",
  "redis",
  "nginx",
  // Helpdesk/Support
  "ticket",
  "incident",
  "st\u00f6rung",
  "fehlermeldung",
  "log",
  "stacktrace",
  "monitoring",
  "grafana",
  "prometheus",
  "sentry",
  "techniker",
  "spezialist",
  "support",
  "hilfe",
  "problem",
  "fehler",
  "bug",
  "issue",
  // Drucker/Hardware
  "drucker",
  "druckertreiber",
  "scanner",
  "toner",
  "hdmi",
  "ssd",
  "ram",
  "netzteil",
  "monitor",
  "peripherie",
  // Lizenzen/Software-Verwaltung
  "lizenz",
  "lizensen",
  "license",
  "key",
  "serial",
  "aktivierung",
  "freischaltung",
  "subscription",
  "abonnement",
  "produktschl\u00fcssel",
  "upgrade",
  "downgrade",
  "verl\u00e4ngerung",
  "renewal",
  // Allgemeine IT-Begriffe
  "auth",
  "login",
  "anmeldung",
  "berechtigung",
  "zugriff",
  "backup",
  "restore",
  "deployment",
  "build",
  "compile",
  "performance",
  "installation",
  "konfiguration",
  "setup",
  "einrichtung",
  "wartung",
  "maintenance",
];

// Gru\u00df / Funktion (einmalig definiert & wiederverwendet)
const GREETING_PATTERNS = [
  /^(hallo|hi|hey|guten\s+(tag|morgen|abend)|moin|servus)$/i,
  /^(hello|good\s+(morning|afternoon|evening))$/i,
  /^(\u043f\u0440\u0438\u0432\u0435\u0442|\u0437\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439|\u0434\u043e\u0431\u0440(\u044b\u0439\s+\u0434\u0435\u043d\u044c|\u043e\u0435\s+\u0443\u0442\u0440\u043e|\u044b\u0439\s+\u0432\u0435\u0447\u0435\u0440))$/i,
];
const FUNCTION_PATTERNS = [
  /was\s+(kannst\s+du|machst\s+du|bist\s+du|ist\s+deine\s+aufgabe)/i,
  /what\s+(can\s+you|do\s+you|are\s+you)/i,
  /\u0447\u0442\u043e\s+(\u0442\u044b\s+\u0443\u043c\u0435\u0435\u0448\u044c|\u0442\u044b\s+\u043c\u043e\u0436\u0435\u0448\u044c|\u0442\u0432\u043e\u044f\s+\u0437\u0430\u0434\u0430\u0447\u0430)/i,
  /(funktionen|features|m\u00f6glichkeiten|capabilities|\u0432\u043e\u0437\u043c\u043e\u0436\u043d\u043e\u0441\u0442\u0438)/i,
  /hilf(st\s+)?mir|help\s+me|\u043f\u043e\u043c\u043e\u0433\u0438/i,
];

// IT-Heuristiken
const COMMON_IT_PATTERNS = [
  /software|hardware|computer|laptop|pc\b/i,
  /password|passwort|kennwort|zugangsdaten/i,
  /email|e-mail|outlook|mail/i,
  /internet|network|netz/i,
  /problem|fehler|error|issue|bug/i,
  /install|setup|einricht|konfig/i,
  /help|hilfe|support|unterst\u00fctzung/i,
  /system|programm|app|anwendung/i,
  /license|lizenz|schl\u00fcssel|key/i,
  /printer|drucker|scan/i,
  /update|upgrade|patch/i,
  /login|anmeld|zugang|berechtigung/i,
];
const NON_IT_PATTERNS = [
  /wetter|weather|\u043f\u043e\u0433\u043e\u0434\u0430/i,
  /kochen|rezept|recipe|\u0440\u0435\u0446\u0435\u043f\u0442/i,
  /sport|fu\u00dfball|football|\u0441\u043f\u043e\u0440\u0442/i,
  /politik|politics|\u043f\u043e\u043b\u0438\u0442\u0438\u043a\u0430/i,
  /musik|music|\u043c\u0443\u0437\u044b\u043a\u0430/i,
  /filme|movie|\u0444\u0438\u043b\u044c\u043c/i,
  /urlaub|vacation|\u043e\u0442\u043f\u0443\u0441\u043a/i,
  /liebe|dating|\u043b\u044e\u0431\u043e\u0432\u044c/i,
  /gesundheit|health|\u0437\u0434\u043e\u0440\u043e\u0432\u044c\u0435/i,
];

const SENSITIVE_KEYWORDS = [
  // Private / vertrauliche Daten
  "kundendaten",
  "client data",
  "private daten",
  "personenbezogen",
  "personal data",
  "pii",
  "gehaltsdaten",
  "salary",
  "sozialversicherungs",
  // Kritische Credentials / Secrets
  "passwort vergessen",
  "password reset",
  "apikey",
  "api key",
  "token",
  "secret",
  "auth token",
  // Expliziter Wunsch nach Ticket / Techniker
  "techniker brauche",
  "admin bitte",
  "bitte ticket",
  "ticket erstellen",
  "create ticket",
  "support ticket",
  "spezialist brauche",
  "kann nicht l\u00f6sen",
  "zu komplex",
];
const LICENSE_KEYWORDS = [
  "lizenz",
  "lizensen",
  "license",
  "produktschl\u00fcssel",
  "serial",
  "aktivierung",
  "freischaltung",
];
const DATA_PROTECTION_KEYWORDS = [
  "kunden",
  "kunde",
  "client",
  "personal",
  "personenbezogen",
  "pii",
  "name",
  "adresse",
  "anschrift",
  "telefon",
  "phone",
  "geburtsdatum",
  "bank",
  "iban",
  "konto",
  "vertrag",
  "rechnung",
  "invoice",
  "gehalt",
  "salary",
  "sozialversicherungs",
];
const DATA_PROTECTION_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/i,
];

// Ticket-Indikatoren
const TICKET_RESPONSE_KEYWORDS = [
  "ticket erstellen",
  "ticket erstelle",
  "support-ticket",
  "weitere hilfe",
  "techniker kontaktieren",
  "techniker",
  "spezialist",
  "kann nicht gel\u00f6st werden",
  "komplexes problem",
  "administrator",
  "keine l\u00f6sung",
  "gerne ein ticket",
  "erstelle ich ein ticket",
];
const COMPLEXITY_KEYWORDS = [
  "mehrere probleme",
  "seit wochen",
  "immer wieder",
  "kritisch",
  "dringend",
  "produktionsausfall",
  "hilfe brauche",
  "hilfe ben\u00f6tige",
  "support brauche",
  "techniker brauche",
  "spezialist brauche",
];
const HUMAN_HELP_KEYWORDS = [
  "techniker",
  "spezialist",
  "admin",
  "jemand der sich auskennt",
  "experte",
  "kollege",
];

/** ---------------------- Utility-Funktionen (klein & testbar) --------------- */
const normalize = t => (t || "").toLowerCase();
const matchAny = (text, patterns) => patterns.some(p => p.test(text));
const countHits = (text, keywords) =>
  keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
const dedupeById = arr => {
  const map = new Map();
  for (const s of arr) map.set(s._id.toString(), s);
  return [...map.values()];
};
const containsSensitiveData = text => {
  const lower = normalize(text);
  return (
    DATA_PROTECTION_KEYWORDS.some(k => lower.includes(k)) ||
    DATA_PROTECTION_PATTERNS.some(p => p.test(text))
  );
};
const sanitizePromptForLog = text => {
  const raw = String(text || "");
  const maxLen = 2000;
  const truncated = raw.length > maxLen ? `${raw.slice(0, maxLen)}...` : raw;
  return truncated
    .replace(DATA_PROTECTION_PATTERNS[0], "[REDACTED_EMAIL]")
    .replace(DATA_PROTECTION_PATTERNS[1], "[REDACTED_IBAN]");
};

// function to get a random response based on language
const getRandomResponse = (responses, lang) => {
  const langResponses = responses[lang] || responses.de;
  return langResponses[Math.floor(Math.random() * langResponses.length)];
};

const detectLang = text => {
  const t = normalize(text);
  if (/[\u0430-\u044f\u0451]/.test(t)) return "ru";
  if (
    /[a-z]/.test(t) &&
    /the|and|please|how|error|issue|login|network/i.test(text)
  )
    return "en";
  return "de";
};

// random responses for greetings and function explanations

/** ---------------------- Service-Klasse ------------------------------------ */
class AIService {
  constructor() {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.config = { ...DEFAULT_CONFIG };
    this.IT_KEYWORDS = IT_KEYWORDS;
  }

  /** Sprache erkennen (klein & robust) */
  detectLang(text) {
    return detectLang(text);
  }

  /** Intent-Heuristik + LLM-Fallback (fr\u00fch & konservativ) */
  async isITIntent(userMessage, _conversationHistory = []) {
    const text = normalize(userMessage);

    // 1) Begr\u00fc\u00dfung/Funktionsfrage => immer IT
    if (
      matchAny(userMessage, GREETING_PATTERNS) ||
      matchAny(userMessage, FUNCTION_PATTERNS)
    )
      return true;

    // 2) Keyword-Heuristik
    if (countHits(text, this.IT_KEYWORDS) >= 1) return true;

    // 3) Generische IT-Begriffe
    if (matchAny(text, COMMON_IT_PATTERNS)) return true;

    // 4) Offensichtliche Nicht-IT
    if (matchAny(text, NON_IT_PATTERNS)) return false;

    // 5) Kurze/unklare Nachrichten => optimistisch
    if (text.length < 50) return true;

    // 6) LLM-Klassifikator (robuster Fallback)
    try {
      const cls = await this.openai.chat.completions.create({
        model: this.config.domainGate.classifierModel,
        temperature: this.config.domainGate.classifierTemperature,
        max_tokens: this.config.domainGate.classifierMaxTokens,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        messages: buildClassifierMessages(userMessage),
      });
      const label = (cls.choices[0].message.content || "").trim().toUpperCase();
      return label === "IT";
    } catch (e) {
      logger.warn({ err: e }, "AI classifier fallback triggered");
      return true;
    }
  }

  /** Wissensbasis-Suche (Fulltext -> Fallback) */
  async searchSolutions(query, limit = 5) {
    try {
      // 1) Volltext (falls Textindex vorhanden)
      try {
        const textResults = await Solution.find({
          isActive: true,
          $text: { $search: query },
        })
          .select(SELECT_FIELDS)
          .sort(TEXT_SORT)
          .limit(limit);
        if (textResults.length) return textResults;
      } catch {
        // still & simple fallback
      }

      // 2) Fallback: Titel/Problem/Keywords (parallel)
      const searchTerms = normalize(query)
        .split(" ")
        .filter(t => t.length > 2);
      let keywordMatchesPromise = Promise.resolve([]);
      if (searchTerms.length) {
        keywordMatchesPromise = Solution.find({
          isActive: true,
          keywords: { $in: searchTerms.map(t => new RegExp(t, "i")) },
        })
          .select(SELECT_FIELDS)
          .sort(DEFAULT_SORT)
          .limit(limit);
      }

      const [titleMatches, problemMatches, keywordMatches] = await Promise.all([
        Solution.find({
          isActive: true,
          title: { $regex: query, $options: "i" },
        })
          .select(SELECT_FIELDS)
          .sort(DEFAULT_SORT)
          .limit(limit),
        Solution.find({
          isActive: true,
          problem: { $regex: query, $options: "i" },
        })
          .select(SELECT_FIELDS)
          .sort(DEFAULT_SORT)
          .limit(limit),
        keywordMatchesPromise,
      ]);

      return dedupeById([
        ...titleMatches,
        ...problemMatches,
        ...keywordMatches,
      ]).slice(0, limit);
    } catch (error) {
      logger.error({ err: error }, "AI solution search failed");
      return [];
    }
  }

  /** Antwortgenerierung (Hauptfluss) */
  async generateResponse(userMessage, conversationHistory = [], _summary = "") {
    try {
      await AIRequestLog.create({ prompt: sanitizePromptForLog(userMessage) }); // Logging request
      // 0) Domain-Gate
      const isIT = await this.isITIntent(userMessage, conversationHistory);
      if (!isIT) {
        const lang = this.detectLang(userMessage);
        const msg =
          {
            de: "Hallo! \u{1f60a} Ich bin auf IT-Themen spezialisiert. Wenn Sie Fragen zu Software, Hardware, Netzwerk oder anderen IT-Problemen haben, helfe ich gerne weiter!",
            en: "Hello! \u{1f60a} I specialize in IT topics. If you have questions about software, hardware, networks, or other IT issues, I'd be happy to help!",
            ru: "\u041f\u0440\u0438\u0432\u0435\u0442! \u{1f60a} \u042f \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0437\u0438\u0440\u0443\u044e\u0441\u044c \u043d\u0430 \u0418\u0422-\u0432\u043e\u043f\u0440\u043e\u0441\u0430\u0445. \u0415\u0441\u043b\u0438 \u0443 \u0432\u0430\u0441 \u0435\u0441\u0442\u044c \u0432\u043e\u043f\u0440\u043e\u0441\u044b \u043f\u043e \u0441\u043e\u0444\u0442\u0443, \u0436\u0435\u043b\u0435\u0437\u0443, \u0441\u0435\u0442\u044f\u043c \u0438\u043b\u0438 \u0434\u0440\u0443\u0433\u0438\u043c \u0418\u0422-\u043f\u0440\u043e\u0431\u043b\u0435\u043c\u0430\u043c, \u0431\u0443\u0434\u0443 \u0440\u0430\u0434 \u043f\u043e\u043c\u043e\u0447\u044c!",
          }[lang] ||
          "Hallo! \u{1f60a} Ich bin auf IT-Themen spezialisiert. Wenn Sie Fragen zu Software, Hardware, Netzwerk oder anderen IT-Problemen haben, helfe ich gerne weiter!";
        return {
          type: "out_of_scope",
          message: msg,
          shouldCreateTicket: false,
          metadata: { domainGate: "blocked" },
        };
      }

      const lower = normalize(userMessage);
      const needsImmediateEscalation = SENSITIVE_KEYWORDS.some(k =>
        lower.includes(k)
      );
      const isLicenseRequest = LICENSE_KEYWORDS.some(k => lower.includes(k));
      const touchesProtectedData = containsSensitiveData(userMessage);
      const isGreeting = matchAny(userMessage, GREETING_PATTERNS);
      const isFunctionQuestion = matchAny(userMessage, FUNCTION_PATTERNS);

      // 1) L\u00f6sungen nur suchen, wenn sinnvoll
      const shouldSearch =
        !isGreeting &&
        !isFunctionQuestion &&
        !(needsImmediateEscalation && !isLicenseRequest) &&
        !touchesProtectedData &&
        !isLicenseRequest;
      let solutions = [];
      if (shouldSearch) {
        solutions = await this.searchSolutions(
          userMessage,
          this.config.maxSolutionsInContext
        );
      }

      // 2) Prompt-Typ bestimmen
      let responseType;
      let systemPrompt;
      let relatedSolutions = []; // f\u00fcr Logging
      let directResponse = null; // for predefined random responses

      if (isGreeting || isFunctionQuestion) {
        responseType = "greeting_or_function";
        const lang = this.detectLang(userMessage);

        // choose random response
        if (isFunctionQuestion) {
          directResponse = getRandomResponse(FUNCTION_RESPONSES, lang);
        } else {
          directResponse = getRandomResponse(GREETING_RESPONSES, lang);
        }
      } else if (isLicenseRequest || touchesProtectedData) {
        responseType = "license_request";
        systemPrompt = SYSTEM_PROMPTS.license_request;
      } else if (needsImmediateEscalation) {
        responseType = "escalation_required";
        systemPrompt = SYSTEM_PROMPTS.escalation_required;
      } else if (solutions.length > 0) {
        responseType = "solution_found";
        relatedSolutions = solutions;
        const solutionsContext = buildSolutionContext(solutions);
        systemPrompt = buildSolutionPrompt(solutionsContext);
      } else {
        responseType = "no_solution_found";
        systemPrompt = SYSTEM_PROMPTS.no_solution_found;
      }

      // 3) Antwort generieren
      let aiResponse;
      let tokensUsed = 0;

      if (directResponse) {
        // Verwenden vordefinierter zuf\u00e4lliger Antwort
        aiResponse = directResponse;
      } else {
        // Verwenden OpenAI zur Antwortgenerierung
        const limitedHistory = conversationHistory.slice(-6);
        const messages = [
          { role: "system", content: systemPrompt },
          ...limitedHistory,
          { role: "user", content: userMessage },
        ];

        const completion = await this.openai.chat.completions.create({
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          frequency_penalty: 0.2,
          presence_penalty: 0.0,
        });

        aiResponse = completion.choices[0]?.message?.content || "";
        tokensUsed = completion.usage?.total_tokens || 0;
      }

      // 3b) Datenschutz / Datenqualit\u00e4t: Antwort blockieren, falls sensibel
      const responseLower = normalize(aiResponse);
      const responseContainsSensitive =
        containsSensitiveData(aiResponse) ||
        LICENSE_KEYWORDS.some(k => responseLower.includes(k));
      const shouldBlockSensitiveResponse =
        responseContainsSensitive &&
        !isGreeting &&
        !isFunctionQuestion &&
        (touchesProtectedData || isLicenseRequest || needsImmediateEscalation);
      if (shouldBlockSensitiveResponse) {
        const lang = this.detectLang(userMessage);
        const msg =
          {
            de: "Entschuldigung, dabei kann ich nicht helfen. Bitte f\u00fcllen Sie das Helpdesk-Formular aus; der 1st Level Support \u00fcbernimmt die weitere Bearbeitung.",
            en: "Sorry, I cannot help with that. Please fill out the helpdesk form; 1st level support will handle the request.",
            ru: "\u0418\u0437\u0432\u0438\u043d\u0438\u0442\u0435, \u0441 \u044d\u0442\u0438\u043c \u044f \u043f\u043e\u043c\u043e\u0447\u044c \u043d\u0435 \u043c\u043e\u0433\u0443. \u041f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430, \u0437\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u0444\u043e\u0440\u043c\u0443 helpdesk; 1st level support \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u0437\u0430\u043f\u0440\u043e\u0441.",
          }[lang] ||
          "Entschuldigung, dabei kann ich nicht helfen. Bitte f\u00fcllen Sie das Helpdesk-Formular aus; der 1st Level Support \u00fcbernimmt die weitere Bearbeitung.";
        return {
          type: "escalation_required",
          message: msg,
          relatedSolutions,
          shouldCreateTicket: true,
          metadata: {
            tokensUsed,
            model: this.config.model,
            solutionsFound: solutions.length,
            usedDirectResponse: false,
            safety: "blocked_sensitive_response",
          },
        };
      }

      // 4) Ticket-Empfehlung
      const shouldCreateTicket =
        responseType === "no_solution_found" ||
        responseType === "escalation_required" ||
        responseType === "license_request" ||
        (responseType !== "greeting_or_function" &&
          this.shouldRecommendTicket(aiResponse, userMessage)) ||
        needsImmediateEscalation;

      return {
        type: responseType,
        message: aiResponse,
        relatedSolutions,
        shouldCreateTicket,
        metadata: {
          tokensUsed,
          model: this.config.model,
          solutionsFound: solutions.length,
          usedDirectResponse: !!directResponse,
        },
      };
    } catch (error) {
      logger.error({ err: error }, "AI response generation failed");
      return {
        type: "error",
        message:
          "Entschuldigung, es gab einen technischen Fehler. Bitte versuchen Sie es erneut oder erstellen Sie ein Support-Ticket f\u00fcr weitere Hilfe.",
        shouldCreateTicket: true,
        metadata: { error: error.message },
      };
    }
  }

  /** Priorit\u00e4t bestimmen (einfaches Single-Label) */
  async analyzePriority(message) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        temperature: 0.3,
        max_tokens: 10,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        messages: [
          {
            role: "system",
            content: `Analysiere die Priorit\u00e4t dieses Problems basierend auf:
- Auswirkung auf die Arbeit (Low/Medium/High)
- Dringlichkeit (Low/Medium/High)
- Anzahl betroffener Benutzer

Kategorien:
- Low: Kleine Probleme, keine Arbeitsunterbrechung
- Medium: Moderate Probleme, teilweise Arbeitsunterbrechung
- High: Kritische Probleme, schwere Arbeitsunterbrechung, Systemausfall

Antworte nur mit: Low, Medium oder High`,
          },
          { role: "user", content: message },
        ],
      });
      const out = (completion.choices[0]?.message?.content || "").trim();
      return ["Low", "Medium", "High"].includes(out) ? out : "Medium";
    } catch (e) {
      logger.error({ err: e }, "AI priority analysis failed");
      return "Medium";
    }
  }

  /** Kategorie bestimmen (Single-Label) */
  async categorizeIssue(message) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        temperature: 0.2,
        max_tokens: 10,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        messages: [
          {
            role: "system",
            content: `Kategorisiere dieses Problem in eine der folgenden Kategorien:
- Hardware: Physische Ger\u00e4te, Computer, Drucker, etc.
- Software: Programme, Apps, Betriebssysteme
- Netzwerk: Internet, WLAN, Verbindungsprobleme
- Account: Login-Probleme, Passw\u00f6rter, Benutzerkonten
- Email: E-Mail-Probleme, Outlook, etc.
- Sonstiges: Alles andere

Antworte nur mit der Kategorie.`,
          },
          { role: "user", content: message },
        ],
      });
      const out = (completion.choices[0]?.message?.content || "").trim();
      const valid = [
        "Hardware",
        "Software",
        "Netzwerk",
        "Account",
        "Email",
        "Sonstiges",
      ];
      return valid.includes(out) ? out : "Sonstiges";
    } catch (e) {
      logger.error({ err: e }, "AI categorization failed");
      return "Sonstiges";
    }
  }

  /** Ticket-Empfehlung (Heuristik) */
  shouldRecommendTicket(aiResponse, userMessage) {
    const responseText = normalize(aiResponse);
    const userText = normalize(userMessage);
    const hasTicketKeyword = TICKET_RESPONSE_KEYWORDS.some(k =>
      responseText.includes(k)
    );
    const isComplexIssue = COMPLEXITY_KEYWORDS.some(k => userText.includes(k));
    const needsHumanHelp = HUMAN_HELP_KEYWORDS.some(k => userText.includes(k));
    return hasTicketKeyword || isComplexIssue || needsHumanHelp;
  }

  /** Konfig & Verbindung */
  isConfigured() {
    return Boolean(config.openaiApiKey);
  }

  async testConnection() {
    try {
      if (!this.isConfigured())
        throw new Error("OpenAI API Key nicht konfiguriert");
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [{ role: "user", content: "Hallo" }],
        max_tokens: 10,
        temperature: 0.2,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
      });
      return {
        success: true,
        message: "OpenAI Verbindung erfolgreich",
        model: this.config.model,
        response: completion.choices[0]?.message?.content || "",
      };
    } catch (error) {
      return {
        success: false,
        message: "OpenAI Verbindung fehlgeschlagen",
        error: error.message,
      };
    }
  }
}

export default new AIService();
// Optional: benannte Exporte f\u00fcr Tests (keine Breaking Changes)
export {
  detectLang as _detectLang,
  matchAny as _matchAny,
  countHits as _countHits,
};
