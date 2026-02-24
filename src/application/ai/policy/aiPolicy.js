const IT_KEYWORDS = [
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
  "ticket",
  "incident",
  "störung",
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
  "lizenz",
  "lizensen",
  "license",
  "key",
  "serial",
  "aktivierung",
  "freischaltung",
  "subscription",
  "abonnement",
  "produktschlüssel",
  "upgrade",
  "downgrade",
  "verlängerung",
  "renewal",
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

const GREETING_PATTERNS = [
  /^(hallo|hi|hey|guten\s+(tag|morgen|abend)|moin|servus)$/i,
  /^(hello|good\s+(morning|afternoon|evening))$/i,
  /^(\u043f\u0440\u0438\u0432\u0435\u0442|\u0437\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439|\u0434\u043e\u0431\u0440(\u044b\u0439\s+\u0434\u0435\u043d\u044c|\u043e\u0435\s+\u0443\u0442\u0440\u043e|\u044b\u0439\s+\u0432\u0435\u0447\u0435\u0440))$/i,
];

const FUNCTION_PATTERNS = [
  /was\s+(kannst\s+du|machst\s+du|bist\s+du|ist\s+deine\s+aufgabe)/i,
  /what\s+(can\s+you|do\s+you|are\s+you)/i,
  /\u0447\u0442\u043e\s+(\u0442\u044b\s+\u0443\u043c\u0435\u0435\u0448\u044c|\u0442\u044b\s+\u043c\u043e\u0436\u0435\u0448\u044c|\u0442\u0432\u043e\u044f\s+\u0437\u0430\u0434\u0430\u0447\u0430)/i,
  /(funktionen|features|möglichkeiten|capabilities|\u0432\u043e\u0437\u043c\u043e\u0436\u043d\u043e\u0441\u0442\u0438)/i,
  /hilf(st\s+)?mir|help\s+me|\u043f\u043e\u043c\u043e\u0433\u0438/i,
];

const COMMON_IT_PATTERNS = [
  /software|hardware|computer|laptop|pc\b/i,
  /password|passwort|kennwort|zugangsdaten/i,
  /email|e-mail|outlook|mail/i,
  /internet|network|netz/i,
  /problem|fehler|error|issue|bug/i,
  /install|setup|einricht|konfig/i,
  /help|hilfe|support|unterstützung/i,
  /system|programm|app|anwendung/i,
  /license|lizenz|schlüssel|key/i,
  /printer|drucker|scan/i,
  /update|upgrade|patch/i,
  /login|anmeld|zugang|berechtigung/i,
];

const NON_IT_PATTERNS = [
  /wetter|weather|\u043f\u043e\u0433\u043e\u0434\u0430/i,
  /kochen|rezept|recipe|\u0440\u0435\u0446\u0435\u043f\u0442/i,
  /sport|fußball|football|\u0441\u043f\u043e\u0440\u0442/i,
  /politik|politics|\u043f\u043e\u043b\u0438\u0442\u0438\u043a\u0430/i,
  /musik|music|\u043c\u0443\u0437\u044b\u043a\u0430/i,
  /filme|movie|\u0444\u0438\u043b\u044c\u043c/i,
  /urlaub|vacation|\u043e\u0442\u043f\u0443\u0441\u043a/i,
  /liebe|dating|\u043b\u044e\u0431\u043e\u0432\u044c/i,
  /gesundheit|health|\u0437\u0434\u043e\u0440\u043e\u0432\u044c\u0435/i,
];

const SENSITIVE_KEYWORDS = [
  "kundendaten",
  "client data",
  "private daten",
  "personenbezogen",
  "personal data",
  "pii",
  "gehaltsdaten",
  "salary",
  "sozialversicherungs",
  "passwort vergessen",
  "password reset",
  "apikey",
  "api key",
  "token",
  "secret",
  "auth token",
  "techniker brauche",
  "admin bitte",
  "bitte ticket",
  "ticket erstellen",
  "create ticket",
  "support ticket",
  "spezialist brauche",
  "kann nicht lösen",
  "zu komplex",
];

const LICENSE_KEYWORDS = [
  "lizenz",
  "lizensen",
  "license",
  "produktschlüssel",
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

const TICKET_RESPONSE_KEYWORDS = [
  "ticket erstellen",
  "ticket erstelle",
  "support-ticket",
  "weitere hilfe",
  "techniker kontaktieren",
  "techniker",
  "spezialist",
  "kann nicht gelöst werden",
  "komplexes problem",
  "administrator",
  "keine lösung",
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
  "hilfe benötige",
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

const OUT_OF_SCOPE_MESSAGES = {
  de: "Hallo! 😊 Ich bin auf IT-Themen spezialisiert. Wenn Sie Fragen zu Software, Hardware, Netzwerk oder anderen IT-Problemen haben, helfe ich gerne weiter!",
  en: "Hello! 😊 I specialize in IT topics. If you have questions about software, hardware, networks, or other IT issues, I'd be happy to help!",
  ru: "\u041f\u0440\u0438\u0432\u0435\u0442! 😊 \u042f \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0437\u0438\u0440\u0443\u044e\u0441\u044c \u043d\u0430 \u0418\u0422-\u0432\u043e\u043f\u0440\u043e\u0441\u0430\u0445. \u0415\u0441\u043b\u0438 \u0443 \u0432\u0430\u0441 \u0435\u0441\u0442\u044c \u0432\u043e\u043f\u0440\u043e\u0441\u044b \u043f\u043e \u0441\u043e\u0444\u0442\u0443, \u0436\u0435\u043b\u0435\u0437\u0443, \u0441\u0435\u0442\u044f\u043c \u0438\u043b\u0438 \u0434\u0440\u0443\u0433\u0438\u043c \u0418\u0422-\u043f\u0440\u043e\u0431\u043b\u0435\u043c\u0430\u043c, \u0431\u0443\u0434\u0443 \u0440\u0430\u0434 \u043f\u043e\u043c\u043e\u0447\u044c!",
};

const SENSITIVE_BLOCKED_MESSAGES = {
  de: "Entschuldigung, dabei kann ich nicht helfen. Bitte füllen Sie das Helpdesk-Formular aus; der 1st Level Support übernimmt die weitere Bearbeitung.",
  en: "Sorry, I cannot help with that. Please fill out the helpdesk form; 1st level support will handle the request.",
  ru: "\u0418\u0437\u0432\u0438\u043d\u0438\u0442\u0435, \u0441 \u044d\u0442\u0438\u043c \u044f \u043f\u043e\u043c\u043e\u0447\u044c \u043d\u0435 \u043c\u043e\u0433\u0443. \u041f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430, \u0437\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u0444\u043e\u0440\u043c\u0443 helpdesk; 1st level support \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u0437\u0430\u043f\u0440\u043e\u0441.",
};

const TECHNICAL_ERROR_MESSAGES = {
  de: "Entschuldigung, es gab einen technischen Fehler. Bitte versuchen Sie es erneut oder erstellen Sie ein Support-Ticket für weitere Hilfe.",
  en: "Sorry, there was a technical error. Please try again or create a support ticket for further assistance.",
  ru: "\u0418\u0437\u0432\u0438\u043d\u0438\u0442\u0435, \u043f\u0440\u043e\u0438\u0437\u043e\u0448\u043b\u0430 \u0442\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u043e\u0448\u0438\u0431\u043a\u0430. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0435 \u0440\u0430\u0437 \u0438\u043b\u0438 \u0441\u043e\u0437\u0434\u0430\u0439\u0442\u0435 \u0442\u0438\u043a\u0435\u0442 \u0432 \u0441\u043b\u0443\u0436\u0431\u0443 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0438.",
};

const LANGUAGE_MARKERS = {
  en: new Set([
    "i",
    "me",
    "my",
    "mine",
    "we",
    "our",
    "you",
    "your",
    "the",
    "this",
    "that",
    "these",
    "those",
    "is",
    "are",
    "was",
    "were",
    "do",
    "does",
    "did",
    "with",
    "for",
    "from",
    "please",
    "thanks",
    "thank",
    "hello",
    "hi",
    "hey",
    "help",
    "cannot",
    "cant",
    "wont",
    "issue",
    "error",
    "working",
    "login",
    "network",
    "failed",
    "unable",
  ]),
  de: new Set([
    "ich",
    "mir",
    "mein",
    "wir",
    "uns",
    "unser",
    "sie",
    "ihr",
    "der",
    "die",
    "das",
    "ein",
    "eine",
    "ist",
    "sind",
    "war",
    "waren",
    "mit",
    "für",
    "von",
    "nicht",
    "bitte",
    "danke",
    "hallo",
    "guten",
    "hilfe",
    "kann",
    "können",
    "problem",
    "fehler",
    "funktioniert",
  ]),
};

const ENGLISH_LANGUAGE_PATTERNS = [
  /\b(hello|hi|hey|thanks?|please|could|would|should)\b/i,
  /\b(i|you|we|they)\b/i,
  /\b(cannot|can't|don't|doesn't|isn't|won't|couldn't|wouldn't)\b/i,
  /\b(not working|error|issue|help me)\b/i,
];

const GERMAN_LANGUAGE_PATTERNS = [
  /\b(hallo|guten|moin|servus|danke|bitte)\b/i,
  /\b(ich|du|wir|sie)\b/i,
  /\b(nicht|kann|können|funktioniert|fehler|hilfe)\b/i,
];

const normalize = text => (text || "").toLowerCase();

const matchAny = (text, patterns) => patterns.some(pattern => pattern.test(text));

const countHits = (text, keywords) =>
  keywords.reduce((acc, keyword) => acc + (text.includes(keyword) ? 1 : 0), 0);

const detectLang = text => {
  const rawText = String(text || "");
  const normalizedText = normalize(rawText);
  if (/[\u0430-\u044f\u0451]/i.test(rawText)) return "ru";

  const tokens = normalizedText.match(/[a-z\u00e4\u00f6\u00fc\u00df]+/g) || [];
  if (tokens.length === 0) return "de";

  let enScore = 0;
  let deScore = 0;

  for (const token of tokens) {
    if (LANGUAGE_MARKERS.en.has(token)) enScore += 2;
    if (LANGUAGE_MARKERS.de.has(token)) deScore += 2;
    if (/[\u00e4\u00f6\u00fc\u00df]/.test(token)) deScore += 2;
  }

  if (ENGLISH_LANGUAGE_PATTERNS.some(pattern => pattern.test(rawText))) {
    enScore += 2;
  }

  if (GERMAN_LANGUAGE_PATTERNS.some(pattern => pattern.test(rawText))) {
    deScore += 2;
  }

  if (enScore > deScore) return "en";
  if (deScore > enScore) return "de";

  return "de";
};

const containsSensitiveData = text => {
  const lower = normalize(text);
  return (
    DATA_PROTECTION_KEYWORDS.some(keyword => lower.includes(keyword)) ||
    DATA_PROTECTION_PATTERNS.some(pattern => pattern.test(text))
  );
};

const sanitizePromptForLog = text => {
  const raw = String(text || "");
  const maxLength = 2000;
  const truncated = raw.length > maxLength ? `${raw.slice(0, maxLength)}...` : raw;
  return truncated
    .replace(DATA_PROTECTION_PATTERNS[0], "[REDACTED_EMAIL]")
    .replace(DATA_PROTECTION_PATTERNS[1], "[REDACTED_IBAN]");
};

const evaluateITIntentHeuristics = (userMessage, itKeywords = IT_KEYWORDS) => {
  const normalizedMessage = normalize(userMessage);

  if (
    matchAny(userMessage, GREETING_PATTERNS) ||
    matchAny(userMessage, FUNCTION_PATTERNS)
  ) {
    return true;
  }

  if (countHits(normalizedMessage, itKeywords) >= 1) {
    return true;
  }

  if (matchAny(normalizedMessage, COMMON_IT_PATTERNS)) {
    return true;
  }

  if (matchAny(normalizedMessage, NON_IT_PATTERNS)) {
    return false;
  }

  if (normalizedMessage.length < 50) {
    return true;
  }

  return null;
};

const buildPolicyFlags = userMessage => {
  const lower = normalize(userMessage);
  const needsImmediateEscalation = SENSITIVE_KEYWORDS.some(keyword =>
    lower.includes(keyword)
  );
  const isLicenseRequest = LICENSE_KEYWORDS.some(keyword => lower.includes(keyword));
  const touchesProtectedData = containsSensitiveData(userMessage);
  const isGreeting = matchAny(userMessage, GREETING_PATTERNS);
  const isFunctionQuestion = matchAny(userMessage, FUNCTION_PATTERNS);

  return {
    needsImmediateEscalation,
    isLicenseRequest,
    touchesProtectedData,
    isGreeting,
    isFunctionQuestion,
  };
};

const shouldSearchSolutions = flags =>
  !flags.isGreeting &&
  !flags.isFunctionQuestion &&
  !(flags.needsImmediateEscalation && !flags.isLicenseRequest) &&
  !flags.touchesProtectedData &&
  !flags.isLicenseRequest;

const shouldBlockSensitiveResponse = ({ aiResponse, flags }) => {
  const responseLower = normalize(aiResponse);
  const responseContainsSensitive =
    containsSensitiveData(aiResponse) ||
    LICENSE_KEYWORDS.some(keyword => responseLower.includes(keyword));

  return (
    responseContainsSensitive &&
    !flags.isGreeting &&
    !flags.isFunctionQuestion &&
    (flags.touchesProtectedData ||
      flags.isLicenseRequest ||
      flags.needsImmediateEscalation)
  );
};

const shouldRecommendTicket = (aiResponse, userMessage) => {
  const responseText = normalize(aiResponse);
  const userText = normalize(userMessage);
  const hasTicketKeyword = TICKET_RESPONSE_KEYWORDS.some(keyword =>
    responseText.includes(keyword)
  );
  const isComplexIssue = COMPLEXITY_KEYWORDS.some(keyword =>
    userText.includes(keyword)
  );
  const needsHumanHelp = HUMAN_HELP_KEYWORDS.some(keyword =>
    userText.includes(keyword)
  );

  return hasTicketKeyword || isComplexIssue || needsHumanHelp;
};

const shouldCreateTicket = ({
  responseType,
  aiResponse,
  userMessage,
  needsImmediateEscalation,
}) =>
  responseType === "no_solution_found" ||
  responseType === "escalation_required" ||
  responseType === "license_request" ||
  (responseType !== "greeting_or_function" &&
    shouldRecommendTicket(aiResponse, userMessage)) ||
  needsImmediateEscalation;

const getOutOfScopeMessage = lang => OUT_OF_SCOPE_MESSAGES[lang] || OUT_OF_SCOPE_MESSAGES.de;

const getSensitiveBlockedMessage = lang =>
  SENSITIVE_BLOCKED_MESSAGES[lang] || SENSITIVE_BLOCKED_MESSAGES.de;

const getTechnicalErrorMessage = lang =>
  TECHNICAL_ERROR_MESSAGES[lang] || TECHNICAL_ERROR_MESSAGES.de;

export {
  IT_KEYWORDS,
  GREETING_PATTERNS,
  FUNCTION_PATTERNS,
  normalize,
  matchAny,
  countHits,
  detectLang,
  containsSensitiveData,
  sanitizePromptForLog,
  evaluateITIntentHeuristics,
  buildPolicyFlags,
  shouldSearchSolutions,
  shouldBlockSensitiveResponse,
  shouldRecommendTicket,
  shouldCreateTicket,
  getOutOfScopeMessage,
  getSensitiveBlockedMessage,
  getTechnicalErrorMessage,
};

