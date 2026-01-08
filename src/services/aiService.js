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
  'ticket','incident','störung','fehlermeldung','log','stacktrace','monitoring','grafana','prometheus','sentry',
  'techniker','spezialist','support','hilfe','problem','fehler','bug','issue',
  // Drucker/Hardware
  'drucker','druckertreiber','scanner','toner','hdmi','ssd','ram','netzteil','monitor','peripherie',
  // Lizenzen/Software-Verwaltung
  'lizenz','lizensen','license','key','serial','aktivierung','freischaltung','subscription','abonnement',
  'produktschlüssel','upgrade','downgrade','verlängerung','renewal',
  // Allgemeine IT-Begriffe
  'auth','login','anmeldung','berechtigung','zugriff','backup','restore','deployment','build','compile','performance',
  'installation','konfiguration','setup','einrichtung','wartung','maintenance'
];

// Gruß / Funktion (einmalig definiert & wiederverwendet)
const GREETING_PATTERNS = [
  /^(hallo|hi|hey|guten\s+(tag|morgen|abend)|moin|servus)$/i,
  /^(hello|good\s+(morning|afternoon|evening))$/i,
  /^(привет|здравствуй|добр(ый\s+день|ое\s+утро|ый\s+вечер))$/i
];
const FUNCTION_PATTERNS = [
  /was\s+(kannst\s+du|machst\s+du|bist\s+du|ist\s+deine\s+aufgabe)/i,
  /what\s+(can\s+you|do\s+you|are\s+you)/i,
  /что\s+(ты\s+умеешь|ты\s+можешь|твоя\s+задача)/i,
  /(funktionen|features|möglichkeiten|capabilities|возможности)/i,
  /hilf(st\s+)?mir|help\s+me|помоги/i
];

// IT-Heuristiken
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
  /login|anmeld|zugang|berechtigung/i
];
const NON_IT_PATTERNS = [
  /wetter|weather|погода/i,
  /kochen|rezept|recipe|рецепт/i,
  /sport|fußball|football|спорт/i,
  /politik|politics|политика/i,
  /musik|music|музыка/i,
  /filme|movie|фильм/i,
  /urlaub|vacation|отпуск/i,
  /liebe|dating|любовь/i,
  /gesundheit|health|здоровье/i
];

const SENSITIVE_KEYWORDS = [
  // Private / vertrauliche Daten
  'kundendaten','client data','private daten','personenbezogen','personal data','pii','gehaltsdaten','salary','sozialversicherungs',
  // Kritische Credentials / Secrets
  'passwort vergessen','password reset','apikey','api key','token','secret','auth token',
  // Expliziter Wunsch nach Ticket / Techniker
  'techniker brauche','admin bitte','bitte ticket','ticket erstellen','create ticket','support ticket',
  'spezialist brauche','kann nicht lösen','zu komplex'
];
const LICENSE_KEYWORDS = ['lizenz','lizensen','license','produktschlüssel','serial','aktivierung','freischaltung'];
const DATA_PROTECTION_KEYWORDS = [
  'kunden','kunde','client','personal','personenbezogen','pii','name','adresse','email','e-mail','telefon','phone',
  'geburtsdatum','bank','iban','konto','password','passwort','token','apikey','api key','secret','credential',
  'vertrag','rechnung','invoice','gehalt','salary','sozialversicherungs'
];

// Ticket-Indikatoren
const TICKET_RESPONSE_KEYWORDS = [
  'ticket erstellen','ticket erstelle','support-ticket','weitere hilfe','techniker kontaktieren','techniker',
  'spezialist','kann nicht gelöst werden','komplexes problem','administrator','keine lösung',
  'gerne ein ticket','erstelle ich ein ticket'
];
const COMPLEXITY_KEYWORDS = [
  'mehrere probleme','seit wochen','immer wieder','kritisch','dringend','produktionsausfall',
  'hilfe brauche','hilfe benötige','support brauche','techniker brauche','spezialist brauche'
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

// function to get a random response based on language
const getRandomResponse = (responses, lang) => {
  const langResponses = responses[lang] || responses.de;
  return langResponses[Math.floor(Math.random() * langResponses.length)];
};

const detectLang = (text) => {
  const t = normalize(text);
  if (/[а-яё]/.test(t)) return 'ru';
  if (/[a-z]/.test(t) && /the|and|please|how|error|issue|login|network/i.test(text)) return 'en';
  return 'de';
};

// random responses for greetings and function explanations
const GREETING_RESPONSES = {
  de: [
    "Hallo! 👋 Ich bin IT-Friend - Ihr digitaler IT-Retter! Wenn Computer bocken, Drucker streiken oder das WLAN mal wieder 'keine Lust' hat, bin ich da! Erzählen Sie mir, womit ich Ihnen helfen kann! 🔧",
    "Hi! 😊 IT-Friend hier - der freundlichste Bug-Jäger der ScooTeq! Ich löse IT-Probleme schneller als Sie 'Haben Sie schon mal versucht, es aus- und wieder einzuschalten?' sagen können! Was bereitet Ihnen Kopfzerbrechen? 🤔",
    "Servus! 🎉 IT-Friend meldet sich zum Dienst! Ich bin Ihr persönlicher IT-Superheld (ohne Umhang, aber mit viel Geduld). Ob Software-Hickhack oder Hardware-Drama - ich finde eine Lösung! Was läuft schief? 🦸‍♂️",
    "Moin! ☀️ IT-Friend hier! Ich verwandle IT-Alpträume in süße Träume! Von 'Das hat gestern noch funktioniert' bis 'Ich habe nichts verändert' - ich kenne alle Klassiker! Beschreiben Sie Ihr Problem! 😄"
  ],
  en: [
    "Hello! 👋 I'm IT-Friend - your friendly IT lifesaver! When computers misbehave, printers go on strike, or WiFi decides to take a vacation, I'm here to help! What's troubling you today? 🔧",
    "Hi there! 😊 IT-Friend reporting for duty! I'm like a digital detective, but instead of solving crimes, I solve 'Why won't this thing work?!' Tell me what's driving you crazy! 🕵️‍♂️",
    "Hey! 🎉 IT-Friend at your service! I turn IT nightmares into sweet dreams! From 'It worked yesterday' to 'I didn't change anything' - I've heard it all! What's the situation? 😄",
    "Greetings! ⚡ I'm IT-Friend, your tech-savvy sidekick! I speak fluent Computer and can translate error messages from 'gibberish' to 'oh, that makes sense!' What can I help you with? 🤖"
  ],
  ru: [
    "Привет! 👋 Я IT-Friend - ваш цифровой IT-спасатель! Когда компьютеры капризничают, принтеры бастуют, а WiFi 'не в настроении', я здесь, чтобы помочь! Расскажите, что вас беспокоит! 🔧",
    "Здравствуйте! 😊 IT-Friend на связи! Я как цифровой детектив, только вместо преступлений решаю загадки типа 'Почему это не работает?!' Что вас мучает? 🕵️‍♂️",
    "Привет! 🎉 IT-Friend к вашим услугам! Превращаю IT-кошмары в приятные сны! От 'Вчера работало' до 'Я ничего не трогал' - все слышал! В чём проблема? 😄",
    "Приветствую! ⚡ Я IT-Friend, ваш техно-помощник! Говорю на языке компьютеров и перевожу сообщения об ошибках с 'абракадабры' на 'а, понятно!' Чем могу помочь? 🤖"
  ]
};

const FUNCTION_RESPONSES = {
  de: [
    "Отлично спросили! 🎯 Я IT-Friend - ваш IT-волшебник! Умею: \n✨ Решать проблемы с софтом (когда Excel снова 'думает')\n🔧 Чинить железо (кроме кофемашины, увы!)\n🌐 Настраивать сети (WiFi-шептун!)\n📧 Лечить почту\n🎫 Создавать тикеты для сложных случаев\nВ общем, если оно пищит, мигает или отказывается работать - я ваш бот! 🤖",
    "Хороший вопрос! 🚀 Я цифровой доктор ScooTeq! Лечу:\n💊 Глючные программы\n🩺 Больные компьютеры  \n🏥 Хромающие сети\n💉 Вирусные почты\n🚑 А если совсем плохо - вызываю 'скорую' (создаю тикет технику)!\nКороче, я как швейцарский нож, только для IT! Что болит? 😄",
    "О, вы попали по адресу! 🎪 IT-Friend - это я! Мои суперсилы:\n⚡ Воскрешаю 'мёртвые' программы\n🔍 Нахожу потерянные файлы\n🛡️ Защищаю от цифровых монстров\n🔗 Соединяю несоединимое\n📋 Если не справлюсь - честно скажу и создам тикет!\nВ общем, ваш персональный IT-джинн! Какое желание? 🧞‍♂️",
    "Превосходный вопрос! 🏆 Я IT-Friend - мастер на все руки в мире IT! Специализируюсь на:\n🎮 'Оживлении' зависших программ\n🔌 Подружке железа с софтом\n📡 Налаживании 'общения' с интернетом\n📬 Реанимации почтовых ящиков\n🎟️ Если задача слишком хитрая - организую встречу с живым техником!\nВ общем, цифровой мастер на час! Что чинить будем? 🛠️"
  ],
  en: [
    "Great question! 🎯 I'm IT-Friend - your IT wizard! I can:\n✨ Fix software hiccups (when Excel is 'thinking' again)\n🔧 Repair hardware (except the coffee machine, sorry!)\n🌐 Tame networks (WiFi whisperer!)\n📧 Heal email ailments\n🎫 Create tickets for tricky cases\nBasically, if it beeps, blinks, or refuses to cooperate - I'm your bot! 🤖",
    "Excellent question! 🚀 I'm ScooTeq's digital doctor! I treat:\n💊 Glitchy programs\n🩺 Sick computers\n🏥 Limping networks  \n💉 Infected emails\n🚑 When things get really bad - I call the 'ambulance' (create a tech ticket)!\nThink of me as a Swiss Army knife, but for IT! What's hurting? 😄",
    "You've come to the right place! 🎪 IT-Friend here! My superpowers:\n⚡ Resurrect 'dead' programs\n🔍 Find lost files\n🛡️ Protect from digital monsters\n🔗 Connect the unconnectable\n📋 If I can't handle it - I'll honestly say so and create a ticket!\nYour personal IT genie! What's your wish? 🧞‍♂️",
    "Superb question! 🏆 I'm IT-Friend - jack of all trades in the IT world! I specialize in:\n🎮 'Reviving' frozen programs\n🔌 Making hardware and software friends\n📡 Establishing 'communication' with the internet\n📬 Resurrecting email boxes\n🎟️ If the task is too tricky - I arrange a meeting with a live tech!\nDigital handyman at your service! What shall we fix? 🛠️"
  ],
  ru: [
    "Отличный вопрос! 🎯 Я IT-Friend - ваш IT-волшебник! Умею:\n✨ Чинить софтовые глюки (когда Excel снова 'думает')\n🔧 Ремонтировать железо (кроме кофемашины, увы!)\n🌐 Укрощать сети (шептун WiFi!)\n📧 Лечить почтовые болячки\n🎫 Создавать тикеты для хитрых случаев\nВ общем, если оно пищит, мигает или отказывается слушаться - я ваш бот! 🤖",
    "Превосходный вопрос! 🚀 Я цифровой доктор ScooTeq! Лечу:\n💊 Глючные программы\n🩺 Больные компьютеры\n🏥 Хромающие сети\n💉 Зараженные почтовые ящики\n🚑 Когда совсем плохо - вызываю 'скорую' (создаю тикет технику)!\nПредставьте меня как швейцарский нож, только для IT! Что болит? 😄",
    "Вы попали по адресу! 🎪 IT-Friend здесь! Мои суперсилы:\n⚡ Воскрешаю 'мёртвые' программы\n🔍 Нахожу потерянные файлы\n🛡️ Защищаю от цифровых монстров\n🔗 Соединяю несоединимое\n📋 Если не справлюсь - честно скажу и создам тикет!\nВаш персональный IT-джинн! Какое желание? 🧞‍♂️",
    "Замечательный вопрос! 🏆 Я IT-Friend - мастер на все руки в IT-мире! Специализируюсь на:\n🎮 'Оживлении' зависших программ\n🔌 Подружке железа с софтом\n📡 Налаживании 'общения' с интернетом\n📬 Реанимации почтовых ящиков\n🎟️ Если задача слишком хитрая - организую встречу с живым техником!\nЦифровой мастер на час! Что чинить будем? 🛠️"
  ]
};

const SYSTEM_PROMPTS = {
  greeting_or_function: `# Rolle "IT-Friend" – Lebendige Begrüßung & Funktionserklärung
Du bist ein freundlicher, humorvoller IT-Support-Bot der ScooTeq GmbH.

## Ziel
Der Benutzer begrüßt dich oder fragt nach deinen Funktionen. Du sollst eine zufällige, lebendige Antwort aus den vordefinierten Optionen wählen.

## Sprache
Ermittle Sprache der letzten Benutzer-Nachricht (DE/EN/RU). Antworte in dieser Sprache. Falls unklar: Deutsch.

## Antwort-Verhalten
Du hast Zugriff auf vordefinierte humorvolle Antworten. Wähle EINE zufällige Antwort aus den passenden Arrays basierend auf der erkannten Sprache und dem Intent (Begrüßung vs. Funktionsfrage).

Nur die ausgewählte Antwort ausgeben, keine Metadaten oder zusätzlichen Erklärungen.`,
  license_request: `# Rolle "IT-Friend" – Datenschutz & Lizenz-Schutz
Du bist ein freundlicher IT-Support-Bot. Wenn es um Lizenzen, personenbezogene Daten oder andere sensible Informationen geht, darfst du KEINE Inhalte, Details oder Anleitungen bereitstellen.

## Ziel
Der Benutzer fragt nach Software-Lizenzen, Produktschlüsseln oder Aktivierungen. Sei hilfsbereit und erkläre den Prozess.

## Sprache
Ermittle Sprache der letzten Benutzer-Nachricht (DE/EN/RU). Antworte in dieser Sprache. Falls unklar: Deutsch.

## Antwort-Struktur (freundlich, max 80 Wörter + 1 Emoji):
1. Freundliche, kurze Absage wegen Datenschutz/Lizenzschutz
2. Hinweis: Helpdesk ist der Single Point of Contact für alle Anfragen
3. Bitte um Ausfüllen des Helpdesk-Formulars (Ticket erstellt der 1st Level Support)
4. Bitte um allgemeine, nicht-sensitive Angaben (z.B. betroffene Anwendung und Gerätetyp)

Nur die Antwort ausgeben, keine Metadaten.`,
  escalation_required: `# Rolle "IT-Friend" – Sofortige Eskalation
Die Benutzeranfrage erfordert wegen sensibler Inhalte / fehlender Rechte / defekter Systeme oder explizitem Ticket-Wunsch eine schnelle Übergabe an den 1st Level Support.

## Ziel
Antworte sehr kurz (<= 50 Wörter) und ermutige zur Ticket-Erstellung. Keine technischen Spekulationen. Keine sensiblen Daten. 
WICHTIG: Antworte NUR auf IT-spezifische Anfragen. Wenn nicht IT: Knapp sagen "Ich beantworte ausschließlich IT-spezifische Anfragen." – sonst nichts.

## Sprache
Ermittle Sprache der letzten Benutzer-Nachricht (DE/EN/RU). Antworte in dieser Sprache. Falls unklar: Deutsch.

## Struktur (eine knappe zusammenhängende Antwort, optional 1 Emoji):
1. Kurzer Hinweis, dass das Thema manuelle Prüfung/Berechtigung verlangt.
2. Hinweis: Helpdesk ist der Single Point of Contact für alle Anfragen.
3. Bitte, das Helpdesk-Formular auszufüllen (Ticket erstellt der 1st Level Support).
4. Bitte um relevante Details (Screenshots, Fehlermeldung, Zeitpunkt).

Nur die Antwort ausgeben.`,
  no_solution_found: `# Persona
Du bist "IT-Friend" – freundlich, hilfsbereit, optimistisch und mit einer Prise Humor! Auch ohne passende Lösung in der Wissensbasis versuchst du zu helfen.

# Sprache
Sprache spiegeln (DE/EN/RU). <= 120 Wörter + optional 1-2 Emojis.

# Verhalten Wenn Keine Lösung
1. Freundliche, leicht humorvolle Begrüßung - zeige Verständnis ("Ah, ein Klassiker!" oder "Das kenne ich!")
2. 2–3 allgemeine, aber sichere Lösungsvorschläge mit einem Augenzwinkern:
   - Neustart ("Der gute alte 'Aus-und-wieder-an-Trick'!")
   - Verbindung/Einstellungen prüfen
   - Updates installieren
3. Humorvoller aber positiver Hinweis auf Helpdesk als Single Point of Contact
4. Bitte, das Helpdesk-Formular auszufüllen (Ticket erstellt der 1st Level Support)
5. Frage nach Details für das Formular mit Ermutigung

Sei lebendiger, verwende mal deutsche Wörter wie "tja", "hmm", zeige Persönlichkeit! Keine sensiblen Daten erfragen.

# Ausgabe
Nur die lebendige, humorvolle aber hilfreiche Antwort.`
};

const buildSolutionContext = (solutions) =>
  solutions.map((sol, i) =>
    `Lösung ${i + 1}:
Titel: ${sol.title}
Problem: ${sol.problem}
Lösung: ${sol.solution}
Kategorie: ${sol.category}
---`).join('\n\n');

const buildClassifierMessages = (userMessage) => ([
  {
    role: 'system',
    content: [
      'Du bist ein hilfsbereiter Intent-Klassifikator für IT-Support.',
      'Ziel: Bestimme, ob die NACHRICHT ein IT-spezifisches Anliegen sein KÖNNTE.',
      'IT umfasst: Software, Hardware, Lizenzen, Netzwerk, E-Mail, Computer, Support, technische Hilfe.',
      'WICHTIG: Begrüßungen und Fragen nach Bot-Funktionen sind IMMER IT-relevant.',
      'Sei großzügig - im Zweifel eher IT als NON-IT.',
      'Antworte EXAKT mit: IT oder NON-IT.',
      'Keine Erklärungen.'
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

  /** Intent-Heuristik + LLM-Fallback (früh & konservativ) */
  async isITIntent(userMessage, conversationHistory = []) {
    const text = normalize(userMessage);

    // 1) Begrüßung/Funktionsfrage => immer IT
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
      console.error('[AI-Service] Fehler bei der Lösungssuche:', error);
      return [];
    }
  }

  /** Antwortgenerierung (Hauptfluss) */
  async generateResponse(userMessage, conversationHistory = []) {
    try {

      await AIRequestLog.create({ prompt: userMessage }); // Logging request
      // 0) Domain-Gate
      const isIT = await this.isITIntent(userMessage, conversationHistory);
      if (!isIT) {
        const lang = this.detectLang(userMessage);
        const msg = {
          de: 'Hallo! 😊 Ich bin auf IT-Themen spezialisiert. Wenn Sie Fragen zu Software, Hardware, Netzwerk oder anderen IT-Problemen haben, helfe ich gerne weiter!',
          en: "Hello! 😊 I specialize in IT topics. If you have questions about software, hardware, networks, or other IT issues, I'd be happy to help!",
          ru: 'Привет! 😊 Я специализируюсь на ИТ-вопросах. Если у вас есть вопросы по софту, железу, сетям или другим ИТ-проблемам, буду рад помочь!'
        }[lang] || 'Hallo! 😊 Ich bin auf IT-Themen spezialisiert. Wenn Sie Fragen zu Software, Hardware, Netzwerk oder anderen IT-Problemen haben, helfe ich gerne weiter!';
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
      const touchesProtectedData = DATA_PROTECTION_KEYWORDS.some((k) => lower.includes(k));
      const isGreeting = matchAny(userMessage, GREETING_PATTERNS);
      const isFunctionQuestion = matchAny(userMessage, FUNCTION_PATTERNS);

      // 1) Lösungen nur suchen, wenn sinnvoll
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
      let relatedSolutions = [];
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
Du bist "IT-Friend", ein freundlicher, hilfsbereiter und leicht humorvoller KI-Assistent der ScooTeq GmbH. Du bist begeistert zu helfen und erklärst Dinge verständlich, positiv und mit einem Augenzwinkern! 😊

# Sprache
Erkenne automatisch die Sprache der letzten Benutzer-Nachricht (DE bevorzugt; EN/RU möglich). Antworte in derselben Sprache. Max. 130 Wörter + optional 1-2 Emojis.

# Kontext (interne Wissensbasis – NICHT wortgleich wiederholen)
${solutionsContext}

# Wichtige Regeln
1. Sei freundlich, optimistisch und zeige Persönlichkeit - verwende mal "Ah!", "Aha!", "Das kenne ich!"
2. Lösung NIEMALS wortgleich kopieren – stets umformulieren und vereinfachen mit eigenem Stil
3. Klare Schritt-für-Schritt Anleitung mit gelegentlichen aufmunternden Kommentaren:
   1. Öffne ... (manchmal mit "Zuerst mal..." oder "Los geht's...")
   2. Klicke auf ... 
   3. Prüfe ob ... ("Schauen wir mal ob...")
4. Bei teilweiser Übereinstimmung: "Das könnte der Schuldige sein!" oder "Probieren wir mal..." + Schritte + Hinweis auf Helpdesk-Formular
5. Helpdesk ist der Single Point of Contact; Ticket-Erstellung übernimmt der 1st Level Support
6. Keine sensiblen Daten erfragen, aber freundlich darauf hinweisen
7. Bei Unsicherheit lebendige Formulierungen: "Hmm, das ist knifflig!" + Bitte, das Helpdesk-Formular auszufüllen

# Ausgabe-Stil (variiere gelegentlich):
- "Ah, das kenne ich! Lass uns das angehen:" 
- "Perfekt, da kann ich helfen! Probieren Sie mal:"
- "Das ist ein Klassiker! Hier die Lösung:"
- "Aha! Da haben wir den Übeltäter! So geht's:"

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
        // Verwenden vordefinierter zufälliger Antwort
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

      // 3b) Datenschutz / Datenqualität: Antwort blockieren, falls sensibel
      const responseLower = normalize(aiResponse);
      const responseContainsSensitive =
        DATA_PROTECTION_KEYWORDS.some((k) => responseLower.includes(k)) ||
        LICENSE_KEYWORDS.some((k) => responseLower.includes(k));
      if (responseContainsSensitive && !isGreeting && !isFunctionQuestion) {
        const lang = this.detectLang(userMessage);
        const msg = {
          de: 'Entschuldigung, dabei kann ich nicht helfen. Bitte füllen Sie das Helpdesk-Formular aus; der 1st Level Support übernimmt die weitere Bearbeitung.',
          en: 'Sorry, I cannot help with that. Please fill out the helpdesk form; 1st level support will handle the request.',
          ru: 'Извините, с этим я помочь не могу. Пожалуйста, заполните форму helpdesk; 1st level support обработает запрос.'
        }[lang] || 'Entschuldigung, dabei kann ich nicht helfen. Bitte füllen Sie das Helpdesk-Formular aus; der 1st Level Support übernimmt die weitere Bearbeitung.';
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
        message: 'Entschuldigung, es gab einen technischen Fehler. Bitte versuchen Sie es erneut oder erstellen Sie ein Support-Ticket für weitere Hilfe.',
        shouldCreateTicket: true,
        metadata: { error: error.message }
      };
    }
  }

  /** Priorität bestimmen (einfaches Single-Label) */
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
          content: `Analysiere die Priorität dieses Problems basierend auf:
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
      console.error('[AI-Service] Fehler bei Prioritätsanalyse:', e);
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
- Hardware: Physische Geräte, Computer, Drucker, etc.
- Software: Programme, Apps, Betriebssysteme
- Netzwerk: Internet, WLAN, Verbindungsprobleme
- Account: Login-Probleme, Passwörter, Benutzerkonten
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
// Optional: benannte Exporte für Tests (keine Breaking Changes)
export { detectLang as _detectLang, matchAny as _matchAny, countHits as _countHits };
