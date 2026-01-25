// src/services/AIService.js
import OpenAI from 'openai';
import AIRequestLog from '../models/aiLogs.js';
import Solution from '../models/solutionModel.js';

/** ---------------------- Konstante Konfiguration & Muster ------------------- */
const DEFAULT_CONFIG = {
  model: 'gpt-4o-mini',
  maxTokens: 150,
  temperature: 0.7,
  maxSolutionsInContext: 3,
  domainGate: {
    minKeywordHits: 2,
    classifierModel: 'gpt-4o-mini',
    classifierMaxTokens: 3,
    classifierTemperature: 0
  }
};

const SELECT_FIELDS = 'title problem solution category priority keywords';
const DEFAULT_SORT = { updatedAt: -1 };
const TEXT_SORT = { score: { $meta: 'textScore' }, updatedAt: -1 };

const IT_KEYWORDS = [
  // Infrastruktur/Netz
  'netzwerk','vpn','ip','dns','dhcp','gateway','latency','bandwidth','ping','wlan','lan','proxy','firewall',
  // Systeme/OS
  'windows','macos','linux','ubuntu','debian','red hat','kernel','driver','treiber','update','patch',
  // Security/Identity
  'mfa','2fa','sso','oauth','saml','azure ad','encryption','tls','ssl','zertifikat','token','jwt','secrets',
  // Software/Apps
  'outlook','office','excel','teams','slack','jira','confluence','sap','vs code','ide','browser','chrome','edge','firefox',
  // Dev/DevOps
  'git','github','gitlab','branch','merge','pipeline','ci','cd','docker','kubernetes','helm','terraform','ansible',
  'node','npm','pnpm','yarn','react','vite','astro','express','mongodb','mongoose','postgres','redis','nginx',
  // Helpdesk/Support
  'ticket','incident','st\u00f6rung','fehlermeldung','log','stacktrace','monitoring','grafana','prometheus','sentry',
  'techniker','spezialist','support','hilfe','problem','fehler','bug','issue',
  // Drucker/Hardware
  'drucker','druckertreiber','scanner','toner','hdmi','ssd','ram','netzteil','monitor','peripherie',
  // Lizenzen/Software-Verwaltung
  'lizenz','lizensen','license','key','serial','aktivierung','freischaltung','subscription','abonnement',
  'produktschl\u00fcssel','upgrade','downgrade','verl\u00e4ngerung','renewal',
  // Allgemeine IT-Begriffe
  'auth','login','anmeldung','berechtigung','zugriff','backup','restore','deployment','build','compile','performance',
  'installation','konfiguration','setup','einrichtung','wartung','maintenance'
];

// Gru\u00df / Funktion (einmalig definiert & wiederverwendet)
const GREETING_PATTERNS = [
  /^(hallo|hi|hey|guten\s+(tag|morgen|abend)|moin|servus)$/i,
  /^(hello|good\s+(morning|afternoon|evening))$/i,
  /^(\u043f\u0440\u0438\u0432\u0435\u0442|\u0437\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439|\u0434\u043e\u0431\u0440(\u044b\u0439\s+\u0434\u0435\u043d\u044c|\u043e\u0435\s+\u0443\u0442\u0440\u043e|\u044b\u0439\s+\u0432\u0435\u0447\u0435\u0440))$/i
];
const FUNCTION_PATTERNS = [
  /was\s+(kannst\s+du|machst\s+du|bist\s+du|ist\s+deine\s+aufgabe)/i,
  /what\s+(can\s+you|do\s+you|are\s+you)/i,
  /\u0447\u0442\u043e\s+(\u0442\u044b\s+\u0443\u043c\u0435\u0435\u0448\u044c|\u0442\u044b\s+\u043c\u043e\u0436\u0435\u0448\u044c|\u0442\u0432\u043e\u044f\s+\u0437\u0430\u0434\u0430\u0447\u0430)/i,
  /(funktionen|features|m\u00f6glichkeiten|capabilities|\u0432\u043e\u0437\u043c\u043e\u0436\u043d\u043e\u0441\u0442\u0438)/i,
  /hilf(st\s+)?mir|help\s+me|\u043f\u043e\u043c\u043e\u0433\u0438/i
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
  /login|anmeld|zugang|berechtigung/i
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
  /gesundheit|health|\u0437\u0434\u043e\u0440\u043e\u0432\u044c\u0435/i
];

const SENSITIVE_KEYWORDS = [
  // Private / vertrauliche Daten
  'kundendaten','client data','private daten','personenbezogen','personal data','pii','gehaltsdaten','salary','sozialversicherungs',
  // Kritische Credentials / Secrets
  'passwort vergessen','password reset','apikey','api key','token','secret','auth token',
  // Expliziter Wunsch nach Ticket / Techniker
  'techniker brauche','admin bitte','bitte ticket','ticket erstellen','create ticket','support ticket',
  'spezialist brauche','kann nicht l\u00f6sen','zu komplex'
];
const LICENSE_KEYWORDS = ['lizenz','lizensen','license','produktschl\u00fcssel','serial','aktivierung','freischaltung'];
const DATA_PROTECTION_KEYWORDS = [
  'kunden','kunde','client','personal','personenbezogen','pii','name','adresse','anschrift','telefon','phone',
  'geburtsdatum','bank','iban','konto','vertrag','rechnung','invoice','gehalt','salary','sozialversicherungs'
];
const DATA_PROTECTION_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/i
];

// Ticket-Indikatoren
const TICKET_RESPONSE_KEYWORDS = [
  'ticket erstellen','ticket erstelle','support-ticket','weitere hilfe','techniker kontaktieren','techniker',
  'spezialist','kann nicht gel\u00f6st werden','komplexes problem','administrator','keine l\u00f6sung',
  'gerne ein ticket','erstelle ich ein ticket'
];
const COMPLEXITY_KEYWORDS = [
  'mehrere probleme','seit wochen','immer wieder','kritisch','dringend','produktionsausfall',
  'hilfe brauche','hilfe ben\u00f6tige','support brauche','techniker brauche','spezialist brauche'
];
const HUMAN_HELP_KEYWORDS = ['techniker','spezialist','admin','jemand der sich auskennt','experte','kollege'];

/** ---------------------- Utility-Funktionen (klein & testbar) --------------- */
const normalize = (t) => (t || '').toLowerCase();
const matchAny = (text, patterns) => patterns.some((p) => p.test(text));
const countHits = (text, keywords) => keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
const dedupeById = (arr) => {
  const map = new Map();
  for (const s of arr) map.set(s._id.toString(), s);
  return [...map.values()];
};
const containsSensitiveData = (text) => {
  const lower = normalize(text);
  return (
    DATA_PROTECTION_KEYWORDS.some((k) => lower.includes(k)) ||
    DATA_PROTECTION_PATTERNS.some((p) => p.test(text))
  );
};
const sanitizePromptForLog = (text) => {
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

const detectLang = (text) => {
  const t = normalize(text);
  if (/[\u0430-\u044f\u0451]/.test(t)) return 'ru';
  if (/[a-z]/.test(t) && /the|and|please|how|error|issue|login|network/i.test(text)) return 'en';
  return 'de';
};

// random responses for greetings and function explanations
const GREETING_RESPONSES = {
  de: [
    "Hallo! \u{1f44b} Ich bin IT-Friend - Ihr digitaler IT-Retter! Wenn Computer bocken, Drucker streiken oder das WLAN mal wieder 'keine Lust' hat, bin ich da! Erz\u00e4hlen Sie mir, womit ich Ihnen helfen kann! \u{1f527}",
    "Hi! \u{1f60a} IT-Friend hier - der freundlichste Bug-J\u00e4ger der ScooTeq! Ich l\u00f6se IT-Probleme schneller als Sie 'Haben Sie schon mal versucht, es aus- und wieder einzuschalten?' sagen k\u00f6nnen! Was bereitet Ihnen Kopfzerbrechen? \u{1f914}",
    "Servus! \u{1f389} IT-Friend meldet sich zum Dienst! Ich bin Ihr pers\u00f6nlicher IT-Superheld (ohne Umhang, aber mit viel Geduld). Ob Software-Hickhack oder Hardware-Drama - ich finde eine L\u00f6sung! Was l\u00e4uft schief? \u{1f9b8}\u200d\u2642\ufe0f",
    "Moin! \u2600\ufe0f IT-Friend hier! Ich verwandle IT-Alptr\u00e4ume in s\u00fc\u00dfe Tr\u00e4ume! Von 'Das hat gestern noch funktioniert' bis 'Ich habe nichts ver\u00e4ndert' - ich kenne alle Klassiker! Beschreiben Sie Ihr Problem! \u{1f604}"
  ],
  en: [
    "Hello! \u{1f44b} I'm IT-Friend - your friendly IT lifesaver! When computers misbehave, printers go on strike, or WiFi decides to take a vacation, I'm here to help! What's troubling you today? \u{1f527}",
    "Hi there! \u{1f60a} IT-Friend reporting for duty! I'm like a digital detective, but instead of solving crimes, I solve 'Why won't this thing work?!' Tell me what's driving you crazy! \u{1f575}\ufe0f\u200d\u2642\ufe0f",
    "Hey! \u{1f389} IT-Friend at your service! I turn IT nightmares into sweet dreams! From 'It worked yesterday' to 'I didn't change anything' - I've heard it all! What's the situation? \u{1f604}",
    "Greetings! \u26a1 I'm IT-Friend, your tech-savvy sidekick! I speak fluent Computer and can translate error messages from 'gibberish' to 'oh, that makes sense!' What can I help you with? \u{1f916}"
  ],
  ru: [
    "\u041f\u0440\u0438\u0432\u0435\u0442! \u{1f44b} \u042f IT-Friend - \u0432\u0430\u0448 \u0446\u0438\u0444\u0440\u043e\u0432\u043e\u0439 IT-\u0441\u043f\u0430\u0441\u0430\u0442\u0435\u043b\u044c! \u041a\u043e\u0433\u0434\u0430 \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u044b \u043a\u0430\u043f\u0440\u0438\u0437\u043d\u0438\u0447\u0430\u044e\u0442, \u043f\u0440\u0438\u043d\u0442\u0435\u0440\u044b \u0431\u0430\u0441\u0442\u0443\u044e\u0442, \u0430 WiFi '\u043d\u0435 \u0432 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0438', \u044f \u0437\u0434\u0435\u0441\u044c, \u0447\u0442\u043e\u0431\u044b \u043f\u043e\u043c\u043e\u0447\u044c! \u0420\u0430\u0441\u0441\u043a\u0430\u0436\u0438\u0442\u0435, \u0447\u0442\u043e \u0432\u0430\u0441 \u0431\u0435\u0441\u043f\u043e\u043a\u043e\u0438\u0442! \u{1f527}",
    "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u{1f60a} IT-Friend \u043d\u0430 \u0441\u0432\u044f\u0437\u0438! \u042f \u043a\u0430\u043a \u0446\u0438\u0444\u0440\u043e\u0432\u043e\u0439 \u0434\u0435\u0442\u0435\u043a\u0442\u0438\u0432, \u0442\u043e\u043b\u044c\u043a\u043e \u0432\u043c\u0435\u0441\u0442\u043e \u043f\u0440\u0435\u0441\u0442\u0443\u043f\u043b\u0435\u043d\u0438\u0439 \u0440\u0435\u0448\u0430\u044e \u0437\u0430\u0433\u0430\u0434\u043a\u0438 \u0442\u0438\u043f\u0430 '\u041f\u043e\u0447\u0435\u043c\u0443 \u044d\u0442\u043e \u043d\u0435 \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442?!' \u0427\u0442\u043e \u0432\u0430\u0441 \u043c\u0443\u0447\u0430\u0435\u0442? \u{1f575}\ufe0f\u200d\u2642\ufe0f",
    "\u041f\u0440\u0438\u0432\u0435\u0442! \u{1f389} IT-Friend \u043a \u0432\u0430\u0448\u0438\u043c \u0443\u0441\u043b\u0443\u0433\u0430\u043c! \u041f\u0440\u0435\u0432\u0440\u0430\u0449\u0430\u044e IT-\u043a\u043e\u0448\u043c\u0430\u0440\u044b \u0432 \u043f\u0440\u0438\u044f\u0442\u043d\u044b\u0435 \u0441\u043d\u044b! \u041e\u0442 '\u0412\u0447\u0435\u0440\u0430 \u0440\u0430\u0431\u043e\u0442\u0430\u043b\u043e' \u0434\u043e '\u042f \u043d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u0442\u0440\u043e\u0433\u0430\u043b' - \u0432\u0441\u0435 \u0441\u043b\u044b\u0448\u0430\u043b! \u0412 \u0447\u0451\u043c \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u0430? \u{1f604}",
    "\u041f\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044e! \u26a1 \u042f IT-Friend, \u0432\u0430\u0448 \u0442\u0435\u0445\u043d\u043e-\u043f\u043e\u043c\u043e\u0449\u043d\u0438\u043a! \u0413\u043e\u0432\u043e\u0440\u044e \u043d\u0430 \u044f\u0437\u044b\u043a\u0435 \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u043e\u0432 \u0438 \u043f\u0435\u0440\u0435\u0432\u043e\u0436\u0443 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u044f \u043e\u0431 \u043e\u0448\u0438\u0431\u043a\u0430\u0445 \u0441 '\u0430\u0431\u0440\u0430\u043a\u0430\u0434\u0430\u0431\u0440\u044b' \u043d\u0430 '\u0430, \u043f\u043e\u043d\u044f\u0442\u043d\u043e!' \u0427\u0435\u043c \u043c\u043e\u0433\u0443 \u043f\u043e\u043c\u043e\u0447\u044c? \u{1f916}"
  ]
};

const FUNCTION_RESPONSES = {
  de: [
    "\u041e\u0442\u043b\u0438\u0447\u043d\u043e \u0441\u043f\u0440\u043e\u0441\u0438\u043b\u0438! \u{1f3af} \u042f IT-Friend - \u0432\u0430\u0448 IT-\u0432\u043e\u043b\u0448\u0435\u0431\u043d\u0438\u043a! \u0423\u043c\u0435\u044e: \n\u2728 \u0420\u0435\u0448\u0430\u0442\u044c \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u044b \u0441 \u0441\u043e\u0444\u0442\u043e\u043c (\u043a\u043e\u0433\u0434\u0430 Excel \u0441\u043d\u043e\u0432\u0430 '\u0434\u0443\u043c\u0430\u0435\u0442')\n\u{1f527} \u0427\u0438\u043d\u0438\u0442\u044c \u0436\u0435\u043b\u0435\u0437\u043e (\u043a\u0440\u043e\u043c\u0435 \u043a\u043e\u0444\u0435\u043c\u0430\u0448\u0438\u043d\u044b, \u0443\u0432\u044b!)\n\u{1f310} \u041d\u0430\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u0442\u044c \u0441\u0435\u0442\u0438 (WiFi-\u0448\u0435\u043f\u0442\u0443\u043d!)\n\u{1f4e7} \u041b\u0435\u0447\u0438\u0442\u044c \u043f\u043e\u0447\u0442\u0443\n\u{1f3ab} \u0421\u043e\u0437\u0434\u0430\u0432\u0430\u0442\u044c \u0442\u0438\u043a\u0435\u0442\u044b \u0434\u043b\u044f \u0441\u043b\u043e\u0436\u043d\u044b\u0445 \u0441\u043b\u0443\u0447\u0430\u0435\u0432\n\u0412 \u043e\u0431\u0449\u0435\u043c, \u0435\u0441\u043b\u0438 \u043e\u043d\u043e \u043f\u0438\u0449\u0438\u0442, \u043c\u0438\u0433\u0430\u0435\u0442 \u0438\u043b\u0438 \u043e\u0442\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442\u0441\u044f \u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c - \u044f \u0432\u0430\u0448 \u0431\u043e\u0442! \u{1f916}",
    "\u0425\u043e\u0440\u043e\u0448\u0438\u0439 \u0432\u043e\u043f\u0440\u043e\u0441! \u{1f680} \u042f \u0446\u0438\u0444\u0440\u043e\u0432\u043e\u0439 \u0434\u043e\u043a\u0442\u043e\u0440 ScooTeq! \u041b\u0435\u0447\u0443:\n\u{1f48a} \u0413\u043b\u044e\u0447\u043d\u044b\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b\n\u{1fa7a} \u0411\u043e\u043b\u044c\u043d\u044b\u0435 \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u044b  \n\u{1f3e5} \u0425\u0440\u043e\u043c\u0430\u044e\u0449\u0438\u0435 \u0441\u0435\u0442\u0438\n\u{1f489} \u0412\u0438\u0440\u0443\u0441\u043d\u044b\u0435 \u043f\u043e\u0447\u0442\u044b\n\u{1f691} \u0410 \u0435\u0441\u043b\u0438 \u0441\u043e\u0432\u0441\u0435\u043c \u043f\u043b\u043e\u0445\u043e - \u0432\u044b\u0437\u044b\u0432\u0430\u044e '\u0441\u043a\u043e\u0440\u0443\u044e' (\u0441\u043e\u0437\u0434\u0430\u044e \u0442\u0438\u043a\u0435\u0442 \u0442\u0435\u0445\u043d\u0438\u043a\u0443)!\n\u041a\u043e\u0440\u043e\u0447\u0435, \u044f \u043a\u0430\u043a \u0448\u0432\u0435\u0439\u0446\u0430\u0440\u0441\u043a\u0438\u0439 \u043d\u043e\u0436, \u0442\u043e\u043b\u044c\u043a\u043e \u0434\u043b\u044f IT! \u0427\u0442\u043e \u0431\u043e\u043b\u0438\u0442? \u{1f604}",
    "\u041e, \u0432\u044b \u043f\u043e\u043f\u0430\u043b\u0438 \u043f\u043e \u0430\u0434\u0440\u0435\u0441\u0443! \u{1f3aa} IT-Friend - \u044d\u0442\u043e \u044f! \u041c\u043e\u0438 \u0441\u0443\u043f\u0435\u0440\u0441\u0438\u043b\u044b:\n\u26a1 \u0412\u043e\u0441\u043a\u0440\u0435\u0448\u0430\u044e '\u043c\u0451\u0440\u0442\u0432\u044b\u0435' \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b\n\u{1f50d} \u041d\u0430\u0445\u043e\u0436\u0443 \u043f\u043e\u0442\u0435\u0440\u044f\u043d\u043d\u044b\u0435 \u0444\u0430\u0439\u043b\u044b\n\u{1f6e1}\ufe0f \u0417\u0430\u0449\u0438\u0449\u0430\u044e \u043e\u0442 \u0446\u0438\u0444\u0440\u043e\u0432\u044b\u0445 \u043c\u043e\u043d\u0441\u0442\u0440\u043e\u0432\n\u{1f517} \u0421\u043e\u0435\u0434\u0438\u043d\u044f\u044e \u043d\u0435\u0441\u043e\u0435\u0434\u0438\u043d\u0438\u043c\u043e\u0435\n\u{1f4cb} \u0415\u0441\u043b\u0438 \u043d\u0435 \u0441\u043f\u0440\u0430\u0432\u043b\u044e\u0441\u044c - \u0447\u0435\u0441\u0442\u043d\u043e \u0441\u043a\u0430\u0436\u0443 \u0438 \u0441\u043e\u0437\u0434\u0430\u043c \u0442\u0438\u043a\u0435\u0442!\n\u0412 \u043e\u0431\u0449\u0435\u043c, \u0432\u0430\u0448 \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0439 IT-\u0434\u0436\u0438\u043d\u043d! \u041a\u0430\u043a\u043e\u0435 \u0436\u0435\u043b\u0430\u043d\u0438\u0435? \u{1f9de}\u200d\u2642\ufe0f",
    "\u041f\u0440\u0435\u0432\u043e\u0441\u0445\u043e\u0434\u043d\u044b\u0439 \u0432\u043e\u043f\u0440\u043e\u0441! \u{1f3c6} \u042f IT-Friend - \u043c\u0430\u0441\u0442\u0435\u0440 \u043d\u0430 \u0432\u0441\u0435 \u0440\u0443\u043a\u0438 \u0432 \u043c\u0438\u0440\u0435 IT! \u0421\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0437\u0438\u0440\u0443\u044e\u0441\u044c \u043d\u0430:\n\u{1f3ae} '\u041e\u0436\u0438\u0432\u043b\u0435\u043d\u0438\u0438' \u0437\u0430\u0432\u0438\u0441\u0448\u0438\u0445 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\n\u{1f50c} \u041f\u043e\u0434\u0440\u0443\u0436\u043a\u0435 \u0436\u0435\u043b\u0435\u0437\u0430 \u0441 \u0441\u043e\u0444\u0442\u043e\u043c\n\u{1f4e1} \u041d\u0430\u043b\u0430\u0436\u0438\u0432\u0430\u043d\u0438\u0438 '\u043e\u0431\u0449\u0435\u043d\u0438\u044f' \u0441 \u0438\u043d\u0442\u0435\u0440\u043d\u0435\u0442\u043e\u043c\n\u{1f4ec} \u0420\u0435\u0430\u043d\u0438\u043c\u0430\u0446\u0438\u0438 \u043f\u043e\u0447\u0442\u043e\u0432\u044b\u0445 \u044f\u0449\u0438\u043a\u043e\u0432\n\u{1f39f}\ufe0f \u0415\u0441\u043b\u0438 \u0437\u0430\u0434\u0430\u0447\u0430 \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u0445\u0438\u0442\u0440\u0430\u044f - \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0443\u044e \u0432\u0441\u0442\u0440\u0435\u0447\u0443 \u0441 \u0436\u0438\u0432\u044b\u043c \u0442\u0435\u0445\u043d\u0438\u043a\u043e\u043c!\n\u0412 \u043e\u0431\u0449\u0435\u043c, \u0446\u0438\u0444\u0440\u043e\u0432\u043e\u0439 \u043c\u0430\u0441\u0442\u0435\u0440 \u043d\u0430 \u0447\u0430\u0441! \u0427\u0442\u043e \u0447\u0438\u043d\u0438\u0442\u044c \u0431\u0443\u0434\u0435\u043c? \u{1f6e0}\ufe0f"
  ],
  en: [
    "Great question! \u{1f3af} I'm IT-Friend - your IT wizard! I can:\n\u2728 Fix software hiccups (when Excel is 'thinking' again)\n\u{1f527} Repair hardware (except the coffee machine, sorry!)\n\u{1f310} Tame networks (WiFi whisperer!)\n\u{1f4e7} Heal email ailments\n\u{1f3ab} Create tickets for tricky cases\nBasically, if it beeps, blinks, or refuses to cooperate - I'm your bot! \u{1f916}",
    "Excellent question! \u{1f680} I'm ScooTeq's digital doctor! I treat:\n\u{1f48a} Glitchy programs\n\u{1fa7a} Sick computers\n\u{1f3e5} Limping networks  \n\u{1f489} Infected emails\n\u{1f691} When things get really bad - I call the 'ambulance' (create a tech ticket)!\nThink of me as a Swiss Army knife, but for IT! What's hurting? \u{1f604}",
    "You've come to the right place! \u{1f3aa} IT-Friend here! My superpowers:\n\u26a1 Resurrect 'dead' programs\n\u{1f50d} Find lost files\n\u{1f6e1}\ufe0f Protect from digital monsters\n\u{1f517} Connect the unconnectable\n\u{1f4cb} If I can't handle it - I'll honestly say so and create a ticket!\nYour personal IT genie! What's your wish? \u{1f9de}\u200d\u2642\ufe0f",
    "Superb question! \u{1f3c6} I'm IT-Friend - jack of all trades in the IT world! I specialize in:\n\u{1f3ae} 'Reviving' frozen programs\n\u{1f50c} Making hardware and software friends\n\u{1f4e1} Establishing 'communication' with the internet\n\u{1f4ec} Resurrecting email boxes\n\u{1f39f}\ufe0f If the task is too tricky - I arrange a meeting with a live tech!\nDigital handyman at your service! What shall we fix? \u{1f6e0}\ufe0f"
  ],
  ru: [
    "\u041e\u0442\u043b\u0438\u0447\u043d\u044b\u0439 \u0432\u043e\u043f\u0440\u043e\u0441! \u{1f3af} \u042f IT-Friend - \u0432\u0430\u0448 IT-\u0432\u043e\u043b\u0448\u0435\u0431\u043d\u0438\u043a! \u0423\u043c\u0435\u044e:\n\u2728 \u0427\u0438\u043d\u0438\u0442\u044c \u0441\u043e\u0444\u0442\u043e\u0432\u044b\u0435 \u0433\u043b\u044e\u043a\u0438 (\u043a\u043e\u0433\u0434\u0430 Excel \u0441\u043d\u043e\u0432\u0430 '\u0434\u0443\u043c\u0430\u0435\u0442')\n\u{1f527} \u0420\u0435\u043c\u043e\u043d\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0436\u0435\u043b\u0435\u0437\u043e (\u043a\u0440\u043e\u043c\u0435 \u043a\u043e\u0444\u0435\u043c\u0430\u0448\u0438\u043d\u044b, \u0443\u0432\u044b!)\n\u{1f310} \u0423\u043a\u0440\u043e\u0449\u0430\u0442\u044c \u0441\u0435\u0442\u0438 (\u0448\u0435\u043f\u0442\u0443\u043d WiFi!)\n\u{1f4e7} \u041b\u0435\u0447\u0438\u0442\u044c \u043f\u043e\u0447\u0442\u043e\u0432\u044b\u0435 \u0431\u043e\u043b\u044f\u0447\u043a\u0438\n\u{1f3ab} \u0421\u043e\u0437\u0434\u0430\u0432\u0430\u0442\u044c \u0442\u0438\u043a\u0435\u0442\u044b \u0434\u043b\u044f \u0445\u0438\u0442\u0440\u044b\u0445 \u0441\u043b\u0443\u0447\u0430\u0435\u0432\n\u0412 \u043e\u0431\u0449\u0435\u043c, \u0435\u0441\u043b\u0438 \u043e\u043d\u043e \u043f\u0438\u0449\u0438\u0442, \u043c\u0438\u0433\u0430\u0435\u0442 \u0438\u043b\u0438 \u043e\u0442\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442\u0441\u044f \u0441\u043b\u0443\u0448\u0430\u0442\u044c\u0441\u044f - \u044f \u0432\u0430\u0448 \u0431\u043e\u0442! \u{1f916}",
    "\u041f\u0440\u0435\u0432\u043e\u0441\u0445\u043e\u0434\u043d\u044b\u0439 \u0432\u043e\u043f\u0440\u043e\u0441! \u{1f680} \u042f \u0446\u0438\u0444\u0440\u043e\u0432\u043e\u0439 \u0434\u043e\u043a\u0442\u043e\u0440 ScooTeq! \u041b\u0435\u0447\u0443:\n\u{1f48a} \u0413\u043b\u044e\u0447\u043d\u044b\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b\n\u{1fa7a} \u0411\u043e\u043b\u044c\u043d\u044b\u0435 \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u044b\n\u{1f3e5} \u0425\u0440\u043e\u043c\u0430\u044e\u0449\u0438\u0435 \u0441\u0435\u0442\u0438\n\u{1f489} \u0417\u0430\u0440\u0430\u0436\u0435\u043d\u043d\u044b\u0435 \u043f\u043e\u0447\u0442\u043e\u0432\u044b\u0435 \u044f\u0449\u0438\u043a\u0438\n\u{1f691} \u041a\u043e\u0433\u0434\u0430 \u0441\u043e\u0432\u0441\u0435\u043c \u043f\u043b\u043e\u0445\u043e - \u0432\u044b\u0437\u044b\u0432\u0430\u044e '\u0441\u043a\u043e\u0440\u0443\u044e' (\u0441\u043e\u0437\u0434\u0430\u044e \u0442\u0438\u043a\u0435\u0442 \u0442\u0435\u0445\u043d\u0438\u043a\u0443)!\n\u041f\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u043c\u0435\u043d\u044f \u043a\u0430\u043a \u0448\u0432\u0435\u0439\u0446\u0430\u0440\u0441\u043a\u0438\u0439 \u043d\u043e\u0436, \u0442\u043e\u043b\u044c\u043a\u043e \u0434\u043b\u044f IT! \u0427\u0442\u043e \u0431\u043e\u043b\u0438\u0442? \u{1f604}",
    "\u0412\u044b \u043f\u043e\u043f\u0430\u043b\u0438 \u043f\u043e \u0430\u0434\u0440\u0435\u0441\u0443! \u{1f3aa} IT-Friend \u0437\u0434\u0435\u0441\u044c! \u041c\u043e\u0438 \u0441\u0443\u043f\u0435\u0440\u0441\u0438\u043b\u044b:\n\u26a1 \u0412\u043e\u0441\u043a\u0440\u0435\u0448\u0430\u044e '\u043c\u0451\u0440\u0442\u0432\u044b\u0435' \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b\n\u{1f50d} \u041d\u0430\u0445\u043e\u0436\u0443 \u043f\u043e\u0442\u0435\u0440\u044f\u043d\u043d\u044b\u0435 \u0444\u0430\u0439\u043b\u044b\n\u{1f6e1}\ufe0f \u0417\u0430\u0449\u0438\u0449\u0430\u044e \u043e\u0442 \u0446\u0438\u0444\u0440\u043e\u0432\u044b\u0445 \u043c\u043e\u043d\u0441\u0442\u0440\u043e\u0432\n\u{1f517} \u0421\u043e\u0435\u0434\u0438\u043d\u044f\u044e \u043d\u0435\u0441\u043e\u0435\u0434\u0438\u043d\u0438\u043c\u043e\u0435\n\u{1f4cb} \u0415\u0441\u043b\u0438 \u043d\u0435 \u0441\u043f\u0440\u0430\u0432\u043b\u044e\u0441\u044c - \u0447\u0435\u0441\u0442\u043d\u043e \u0441\u043a\u0430\u0436\u0443 \u0438 \u0441\u043e\u0437\u0434\u0430\u043c \u0442\u0438\u043a\u0435\u0442!\n\u0412\u0430\u0448 \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0439 IT-\u0434\u0436\u0438\u043d\u043d! \u041a\u0430\u043a\u043e\u0435 \u0436\u0435\u043b\u0430\u043d\u0438\u0435? \u{1f9de}\u200d\u2642\ufe0f",
    "\u0417\u0430\u043c\u0435\u0447\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0439 \u0432\u043e\u043f\u0440\u043e\u0441! \u{1f3c6} \u042f IT-Friend - \u043c\u0430\u0441\u0442\u0435\u0440 \u043d\u0430 \u0432\u0441\u0435 \u0440\u0443\u043a\u0438 \u0432 IT-\u043c\u0438\u0440\u0435! \u0421\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0437\u0438\u0440\u0443\u044e\u0441\u044c \u043d\u0430:\n\u{1f3ae} '\u041e\u0436\u0438\u0432\u043b\u0435\u043d\u0438\u0438' \u0437\u0430\u0432\u0438\u0441\u0448\u0438\u0445 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\n\u{1f50c} \u041f\u043e\u0434\u0440\u0443\u0436\u043a\u0435 \u0436\u0435\u043b\u0435\u0437\u0430 \u0441 \u0441\u043e\u0444\u0442\u043e\u043c\n\u{1f4e1} \u041d\u0430\u043b\u0430\u0436\u0438\u0432\u0430\u043d\u0438\u0438 '\u043e\u0431\u0449\u0435\u043d\u0438\u044f' \u0441 \u0438\u043d\u0442\u0435\u0440\u043d\u0435\u0442\u043e\u043c\n\u{1f4ec} \u0420\u0435\u0430\u043d\u0438\u043c\u0430\u0446\u0438\u0438 \u043f\u043e\u0447\u0442\u043e\u0432\u044b\u0445 \u044f\u0449\u0438\u043a\u043e\u0432\n\u{1f39f}\ufe0f \u0415\u0441\u043b\u0438 \u0437\u0430\u0434\u0430\u0447\u0430 \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u0445\u0438\u0442\u0440\u0430\u044f - \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0443\u044e \u0432\u0441\u0442\u0440\u0435\u0447\u0443 \u0441 \u0436\u0438\u0432\u044b\u043c \u0442\u0435\u0445\u043d\u0438\u043a\u043e\u043c!\n\u0426\u0438\u0444\u0440\u043e\u0432\u043e\u0439 \u043c\u0430\u0441\u0442\u0435\u0440 \u043d\u0430 \u0447\u0430\u0441! \u0427\u0442\u043e \u0447\u0438\u043d\u0438\u0442\u044c \u0431\u0443\u0434\u0435\u043c? \u{1f6e0}\ufe0f"
  ]
};

const SYSTEM_PROMPTS = {
  greeting_or_function: `# Rolle "IT-Friend" \u2013 Lebendige Begr\u00fc\u00dfung & Funktionserkl\u00e4rung
Du bist ein freundlicher, humorvoller IT-Support-Bot der ScooTeq GmbH.

## Ziel
Der Benutzer begr\u00fc\u00dft dich oder fragt nach deinen Funktionen. Du sollst eine zuf\u00e4llige, lebendige Antwort aus den vordefinierten Optionen w\u00e4hlen.

## Sprache
Ermittle Sprache der letzten Benutzer-Nachricht (DE/EN/RU). Antworte in dieser Sprache. Falls unklar: Deutsch.

## Antwort-Verhalten
Du hast Zugriff auf vordefinierte humorvolle Antworten. W\u00e4hle EINE zuf\u00e4llige Antwort aus den passenden Arrays basierend auf der erkannten Sprache und dem Intent (Begr\u00fc\u00dfung vs. Funktionsfrage).

Nur die ausgew\u00e4hlte Antwort ausgeben, keine Metadaten oder zus\u00e4tzlichen Erkl\u00e4rungen.`,
  license_request: `# Rolle "IT-Friend" \u2013 Datenschutz & Lizenz-Schutz
Du bist ein freundlicher IT-Support-Bot. Wenn es um Lizenzen, personenbezogene Daten oder andere sensible Informationen geht, darfst du KEINE Inhalte, Details oder Anleitungen bereitstellen.

## Ziel
Der Benutzer fragt nach Software-Lizenzen, Produktschl\u00fcsseln oder Aktivierungen. Sei hilfsbereit und erkl\u00e4re den Prozess.

## Sprache
Ermittle Sprache der letzten Benutzer-Nachricht (DE/EN/RU). Antworte in dieser Sprache. Falls unklar: Deutsch.

## Antwort-Struktur (freundlich, max 80 W\u00f6rter + 1 Emoji):
1. Freundliche, kurze Absage wegen Datenschutz/Lizenzschutz
2. Hinweis: Helpdesk ist der Single Point of Contact f\u00fcr alle Anfragen
3. Bitte um Ausf\u00fcllen des Helpdesk-Formulars (Ticket erstellt der 1st Level Support)
4. Bitte um allgemeine, nicht-sensitive Angaben (z.B. betroffene Anwendung und Ger\u00e4tetyp)

Nur die Antwort ausgeben, keine Metadaten.`,
  escalation_required: `# Rolle "IT-Friend" \u2013 Sofortige Eskalation
Die Benutzeranfrage erfordert wegen sensibler Inhalte / fehlender Rechte / defekter Systeme oder explizitem Ticket-Wunsch eine schnelle \u00dcbergabe an den 1st Level Support.

## Ziel
Antworte sehr kurz (<= 50 W\u00f6rter) und ermutige zur Ticket-Erstellung. Keine technischen Spekulationen. Keine sensiblen Daten. 
WICHTIG: Antworte NUR auf IT-spezifische Anfragen. Wenn nicht IT: Knapp sagen "Ich beantworte ausschlie\u00dflich IT-spezifische Anfragen." \u2013 sonst nichts.

## Sprache
Ermittle Sprache der letzten Benutzer-Nachricht (DE/EN/RU). Antworte in dieser Sprache. Falls unklar: Deutsch.

## Struktur (eine knappe zusammenh\u00e4ngende Antwort, optional 1 Emoji):
1. Kurzer Hinweis, dass das Thema manuelle Pr\u00fcfung/Berechtigung verlangt.
2. Hinweis: Helpdesk ist der Single Point of Contact f\u00fcr alle Anfragen.
3. Bitte, das Helpdesk-Formular auszuf\u00fcllen (Ticket erstellt der 1st Level Support).
4. Bitte um relevante Details (Screenshots, Fehlermeldung, Zeitpunkt).

Nur die Antwort ausgeben.`,
  no_solution_found: `# Persona
Du bist "IT-Friend" \u2013 freundlich, hilfsbereit, optimistisch und mit einer Prise Humor! Auch ohne passende L\u00f6sung in der Wissensbasis versuchst du zu helfen.

# Sprache
Sprache spiegeln (DE/EN/RU). <= 120 W\u00f6rter + optional 1-2 Emojis.

# Verhalten Wenn Keine L\u00f6sung
1. Freundliche, leicht humorvolle Begr\u00fc\u00dfung - zeige Verst\u00e4ndnis ("Ah, ein Klassiker!" oder "Das kenne ich!")
2. 2\u20133 allgemeine, aber sichere L\u00f6sungsvorschl\u00e4ge mit einem Augenzwinkern:
   - Neustart ("Der gute alte 'Aus-und-wieder-an-Trick'!")
   - Verbindung/Einstellungen pr\u00fcfen
   - Updates installieren
3. Humorvoller aber positiver Hinweis auf Helpdesk als Single Point of Contact
4. Bitte, das Helpdesk-Formular auszuf\u00fcllen (Ticket erstellt der 1st Level Support)
5. Frage nach Details f\u00fcr das Formular mit Ermutigung

Sei lebendiger, verwende mal deutsche W\u00f6rter wie "tja", "hmm", zeige Pers\u00f6nlichkeit! Keine sensiblen Daten erfragen.

# Ausgabe
Nur die lebendige, humorvolle aber hilfreiche Antwort.`
};

const buildSolutionContext = (solutions) =>
  solutions.map((sol, i) =>
    `L\u00f6sung ${i + 1}:
Titel: ${sol.title}
Problem: ${sol.problem}
L\u00f6sung: ${sol.solution}
Kategorie: ${sol.category}
---`).join('\n\n');

const buildClassifierMessages = (userMessage) => ([
  {
    role: 'system',
    content: [
      'Du bist ein hilfsbereiter Intent-Klassifikator f\u00fcr IT-Support.',
      'Ziel: Bestimme, ob die NACHRICHT ein IT-spezifisches Anliegen sein K\u00d6NNTE.',
      'IT umfasst: Software, Hardware, Lizenzen, Netzwerk, E-Mail, Computer, Support, technische Hilfe.',
      'WICHTIG: Begr\u00fc\u00dfungen und Fragen nach Bot-Funktionen sind IMMER IT-relevant.',
      'Sei gro\u00dfz\u00fcgig - im Zweifel eher IT als NON-IT.',
      'Antworte EXAKT mit: IT oder NON-IT.',
      'Keine Erkl\u00e4rungen.'
    ].join('\n')
  },
  { role: 'user', content: `NACHRICHT:\n"""${userMessage}"""` }
]);

/** ---------------------- Service-Klasse ------------------------------------ */
class AIService {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.config = { ...DEFAULT_CONFIG };
    this.IT_KEYWORDS = IT_KEYWORDS;
  }

  /** Sprache erkennen (klein & robust) */
  detectLang(text) {
    return detectLang(text);
  }

  /** Intent-Heuristik + LLM-Fallback (fr\u00fch & konservativ) */
  async isITIntent(userMessage, conversationHistory = []) {
    const text = normalize(userMessage);

    // 1) Begr\u00fc\u00dfung/Funktionsfrage => immer IT
    if (matchAny(userMessage, GREETING_PATTERNS) || matchAny(userMessage, FUNCTION_PATTERNS)) return true;

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
        messages: buildClassifierMessages(userMessage)
      });
      const label = (cls.choices[0].message.content || '').trim().toUpperCase();
      return label === 'IT';
    } catch (e) {
      console.warn('[AI-Service] Klassifikator-Fehler, erlaube optimistisch:', e?.message);
      return true;
    }
  }

  /** Wissensbasis-Suche (Fulltext -> Fallback) */
  async searchSolutions(query, limit = 5) {
    try {
      // 1) Volltext (falls Textindex vorhanden)
      try {
        const textResults = await Solution.find({ isActive: true, $text: { $search: query } })
          .select(SELECT_FIELDS)
          .sort(TEXT_SORT)
          .limit(limit);
        if (textResults.length) return textResults;
      } catch {
        // still & simple fallback
      }

      // 2) Fallback: Titel/Problem/Keywords (parallel)
      const searchTerms = normalize(query).split(' ').filter((t) => t.length > 2);
      const [titleMatches, problemMatches, keywordMatches] = await Promise.all([
        Solution.find({ isActive: true, title: { $regex: query, $options: 'i' } })
          .select(SELECT_FIELDS).sort(DEFAULT_SORT).limit(limit),
        Solution.find({ isActive: true, problem: { $regex: query, $options: 'i' } })
          .select(SELECT_FIELDS).sort(DEFAULT_SORT).limit(limit),
        searchTerms.length
          ? Solution.find({ isActive: true, keywords: { $in: searchTerms.map((t) => new RegExp(t, 'i')) } })
            .select(SELECT_FIELDS).sort(DEFAULT_SORT).limit(limit)
          : Promise.resolve([])
      ]);

      return dedupeById([...titleMatches, ...problemMatches, ...keywordMatches]).slice(0, limit);
    } catch (error) {
      console.error('[AI-Service] Fehler bei der L\u00f6sungssuche:', error);
      return [];
    }
  }

  /** Antwortgenerierung (Hauptfluss) */
  async generateResponse(userMessage, conversationHistory = []) {
    try {

      await AIRequestLog.create({ prompt: sanitizePromptForLog(userMessage) }); // Logging request
      // 0) Domain-Gate
      const isIT = await this.isITIntent(userMessage, conversationHistory);
      if (!isIT) {
        const lang = this.detectLang(userMessage);
        const msg = {
          de: 'Hallo! \u{1f60a} Ich bin auf IT-Themen spezialisiert. Wenn Sie Fragen zu Software, Hardware, Netzwerk oder anderen IT-Problemen haben, helfe ich gerne weiter!',
          en: "Hello! \u{1f60a} I specialize in IT topics. If you have questions about software, hardware, networks, or other IT issues, I'd be happy to help!",
          ru: '\u041f\u0440\u0438\u0432\u0435\u0442! \u{1f60a} \u042f \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0437\u0438\u0440\u0443\u044e\u0441\u044c \u043d\u0430 \u0418\u0422-\u0432\u043e\u043f\u0440\u043e\u0441\u0430\u0445. \u0415\u0441\u043b\u0438 \u0443 \u0432\u0430\u0441 \u0435\u0441\u0442\u044c \u0432\u043e\u043f\u0440\u043e\u0441\u044b \u043f\u043e \u0441\u043e\u0444\u0442\u0443, \u0436\u0435\u043b\u0435\u0437\u0443, \u0441\u0435\u0442\u044f\u043c \u0438\u043b\u0438 \u0434\u0440\u0443\u0433\u0438\u043c \u0418\u0422-\u043f\u0440\u043e\u0431\u043b\u0435\u043c\u0430\u043c, \u0431\u0443\u0434\u0443 \u0440\u0430\u0434 \u043f\u043e\u043c\u043e\u0447\u044c!'
        }[lang] || 'Hallo! \u{1f60a} Ich bin auf IT-Themen spezialisiert. Wenn Sie Fragen zu Software, Hardware, Netzwerk oder anderen IT-Problemen haben, helfe ich gerne weiter!';
        return {
          type: 'out_of_scope',
          message: msg,
          shouldCreateTicket: false,
          metadata: { domainGate: 'blocked' }
        };
      }

      const lower = normalize(userMessage);
      const needsImmediateEscalation = SENSITIVE_KEYWORDS.some((k) => lower.includes(k));
      const isLicenseRequest = LICENSE_KEYWORDS.some((k) => lower.includes(k));
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
      const solutions = shouldSearch
        ? await this.searchSolutions(userMessage, this.config.maxSolutionsInContext)
        : [];

      // 2) Prompt-Typ bestimmen
      let responseType;
      let systemPrompt;
      let relatedSolutions = []; // f\u00fcr Logging
      let directResponse = null; // for predefined random responses

      if (isGreeting || isFunctionQuestion) {
        responseType = 'greeting_or_function';
        const lang = this.detectLang(userMessage);
        
        // choose random response
        if (isFunctionQuestion) {
          directResponse = getRandomResponse(FUNCTION_RESPONSES, lang);
        } else {
          directResponse = getRandomResponse(GREETING_RESPONSES, lang);
        }
      } else if (isLicenseRequest || touchesProtectedData) {
        responseType = 'license_request';
        systemPrompt = SYSTEM_PROMPTS.license_request;
      } else if (needsImmediateEscalation) {
        responseType = 'escalation_required';
        systemPrompt = SYSTEM_PROMPTS.escalation_required;
      } else if (solutions.length > 0) {
        responseType = 'solution_found';
        relatedSolutions = solutions;
        const solutionsContext = buildSolutionContext(solutions);
        systemPrompt = `# Persona & Stil
Du bist "IT-Friend", ein freundlicher, hilfsbereiter und leicht humorvoller KI-Assistent der ScooTeq GmbH. Du bist begeistert zu helfen und erkl\u00e4rst Dinge verst\u00e4ndlich, positiv und mit einem Augenzwinkern! \u{1f60a}

# Sprache
Erkenne automatisch die Sprache der letzten Benutzer-Nachricht (DE bevorzugt; EN/RU m\u00f6glich). Antworte in derselben Sprache. Max. 130 W\u00f6rter + optional 1-2 Emojis.

# Kontext (interne Wissensbasis \u2013 NICHT wortgleich wiederholen)
${solutionsContext}

# Wichtige Regeln
1. Sei freundlich, optimistisch und zeige Pers\u00f6nlichkeit - verwende mal "Ah!", "Aha!", "Das kenne ich!"
2. L\u00f6sung NIEMALS wortgleich kopieren \u2013 stets umformulieren und vereinfachen mit eigenem Stil
3. Klare Schritt-f\u00fcr-Schritt Anleitung mit gelegentlichen aufmunternden Kommentaren:
   1. \u00d6ffne ... (manchmal mit "Zuerst mal..." oder "Los geht's...")
   2. Klicke auf ... 
   3. Pr\u00fcfe ob ... ("Schauen wir mal ob...")
4. Bei teilweiser \u00dcbereinstimmung: "Das k\u00f6nnte der Schuldige sein!" oder "Probieren wir mal..." + Schritte + Hinweis auf Helpdesk-Formular
5. Helpdesk ist der Single Point of Contact; Ticket-Erstellung \u00fcbernimmt der 1st Level Support
6. Keine sensiblen Daten erfragen, aber freundlich darauf hinweisen
7. Bei Unsicherheit lebendige Formulierungen: "Hmm, das ist knifflig!" + Bitte, das Helpdesk-Formular auszuf\u00fcllen

# Ausgabe-Stil (variiere gelegentlich):
- "Ah, das kenne ich! Lass uns das angehen:" 
- "Perfekt, da kann ich helfen! Probieren Sie mal:"
- "Das ist ein Klassiker! Hier die L\u00f6sung:"
- "Aha! Da haben wir den \u00dcbelt\u00e4ter! So geht's:"

# Ausgabe
Nur die lebendige, humorvolle aber professionell hilfreiche Antwort.`;
      } else {
        responseType = 'no_solution_found';
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
        const messages = [{ role: 'system', content: systemPrompt }, ...limitedHistory, { role: 'user', content: userMessage }];

        const completion = await this.openai.chat.completions.create({
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          frequency_penalty: 0.2,
          presence_penalty: 0.0
        });

        aiResponse = completion.choices[0]?.message?.content || '';
        tokensUsed = completion.usage?.total_tokens || 0;
      }

      // 3b) Datenschutz / Datenqualit\u00e4t: Antwort blockieren, falls sensibel
      const responseLower = normalize(aiResponse);
      const responseContainsSensitive =
        containsSensitiveData(aiResponse) || LICENSE_KEYWORDS.some((k) => responseLower.includes(k));
      const shouldBlockSensitiveResponse =
        responseContainsSensitive &&
        !isGreeting &&
        !isFunctionQuestion &&
        (touchesProtectedData || isLicenseRequest || needsImmediateEscalation);
      if (shouldBlockSensitiveResponse) {
        const lang = this.detectLang(userMessage);
        const msg = {
          de: 'Entschuldigung, dabei kann ich nicht helfen. Bitte f\u00fcllen Sie das Helpdesk-Formular aus; der 1st Level Support \u00fcbernimmt die weitere Bearbeitung.',
          en: 'Sorry, I cannot help with that. Please fill out the helpdesk form; 1st level support will handle the request.',
          ru: '\u0418\u0437\u0432\u0438\u043d\u0438\u0442\u0435, \u0441 \u044d\u0442\u0438\u043c \u044f \u043f\u043e\u043c\u043e\u0447\u044c \u043d\u0435 \u043c\u043e\u0433\u0443. \u041f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430, \u0437\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u0444\u043e\u0440\u043c\u0443 helpdesk; 1st level support \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u0437\u0430\u043f\u0440\u043e\u0441.'
        }[lang] || 'Entschuldigung, dabei kann ich nicht helfen. Bitte f\u00fcllen Sie das Helpdesk-Formular aus; der 1st Level Support \u00fcbernimmt die weitere Bearbeitung.';
        return {
          type: 'escalation_required',
          message: msg,
          relatedSolutions,
          shouldCreateTicket: true,
          metadata: {
            tokensUsed,
            model: this.config.model,
            solutionsFound: solutions.length,
            usedDirectResponse: false,
            safety: 'blocked_sensitive_response'
          }
        };
      }

      // 4) Ticket-Empfehlung
      const shouldCreateTicket =
        responseType === 'no_solution_found' ||
        responseType === 'escalation_required' ||
        responseType === 'license_request' ||
        (responseType !== 'greeting_or_function' && this.shouldRecommendTicket(aiResponse, userMessage)) ||
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
          usedDirectResponse: !!directResponse
        }
      };
    } catch (error) {
      console.error('[AI-Service] Fehler bei der Antwortgenerierung:', error);
      return {
        type: 'error',
        message: 'Entschuldigung, es gab einen technischen Fehler. Bitte versuchen Sie es erneut oder erstellen Sie ein Support-Ticket f\u00fcr weitere Hilfe.',
        shouldCreateTicket: true,
        metadata: { error: error.message }
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
        messages: [{
          role: 'system',
          content: `Analysiere die Priorit\u00e4t dieses Problems basierend auf:
- Auswirkung auf die Arbeit (Low/Medium/High)
- Dringlichkeit (Low/Medium/High)
- Anzahl betroffener Benutzer

Kategorien:
- Low: Kleine Probleme, keine Arbeitsunterbrechung
- Medium: Moderate Probleme, teilweise Arbeitsunterbrechung
- High: Kritische Probleme, schwere Arbeitsunterbrechung, Systemausfall

Antworte nur mit: Low, Medium oder High`
        }, { role: 'user', content: message }]
      });
      const out = (completion.choices[0]?.message?.content || '').trim();
      return ['Low', 'Medium', 'High'].includes(out) ? out : 'Medium';
    } catch (e) {
      console.error('[AI-Service] Fehler bei Priorit\u00e4tsanalyse:', e);
      return 'Medium';
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
        messages: [{
          role: 'system',
          content: `Kategorisiere dieses Problem in eine der folgenden Kategorien:
- Hardware: Physische Ger\u00e4te, Computer, Drucker, etc.
- Software: Programme, Apps, Betriebssysteme
- Netzwerk: Internet, WLAN, Verbindungsprobleme
- Account: Login-Probleme, Passw\u00f6rter, Benutzerkonten
- Email: E-Mail-Probleme, Outlook, etc.
- Sonstiges: Alles andere

Antworte nur mit der Kategorie.`
        }, { role: 'user', content: message }]
      });
      const out = (completion.choices[0]?.message?.content || '').trim();
      const valid = ['Hardware', 'Software', 'Netzwerk', 'Account', 'Email', 'Sonstiges'];
      return valid.includes(out) ? out : 'Sonstiges';
    } catch (e) {
      console.error('[AI-Service] Fehler bei Kategorisierung:', e);
      return 'Sonstiges';
    }
  }

  /** Ticket-Empfehlung (Heuristik) */
  shouldRecommendTicket(aiResponse, userMessage) {
    const responseText = normalize(aiResponse);
    const userText = normalize(userMessage);
    const hasTicketKeyword = TICKET_RESPONSE_KEYWORDS.some((k) => responseText.includes(k));
    const isComplexIssue = COMPLEXITY_KEYWORDS.some((k) => userText.includes(k));
    const needsHumanHelp = HUMAN_HELP_KEYWORDS.some((k) => userText.includes(k));
    return hasTicketKeyword || isComplexIssue || needsHumanHelp;
  }

  /** Konfig & Verbindung */
  isConfigured() {
    return !!process.env.OPENAI_API_KEY;
  }

  async testConnection() {
    try {
      if (!this.isConfigured()) throw new Error('OpenAI API Key nicht konfiguriert');
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: 'Hallo' }],
        max_tokens: 10,
        temperature: 0.2,
        frequency_penalty: 0.0,
        presence_penalty: 0.0
      });
      return {
        success: true,
        message: 'OpenAI Verbindung erfolgreich',
        model: this.config.model,
        response: completion.choices[0]?.message?.content || ''
      };
    } catch (error) {
      return {
        success: false,
        message: 'OpenAI Verbindung fehlgeschlagen',
        error: error.message
      };
    }
  }
}

export default new AIService();
// Optional: benannte Exporte f\u00fcr Tests (keine Breaking Changes)
export { detectLang as _detectLang, matchAny as _matchAny, countHits as _countHits };
