import OpenAI from 'openai';
import Solution from '../models/solutionModel.js';

class AIService {
  constructor() {
    // OpenAI Client initialisieren
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Konfiguration
    this.config = {
      model: 'gpt-4o-mini',
      maxTokens: 150,
      temperature: 0.7,
      maxSolutionsInContext: 3,
      // NEU: Domänen-Gate Konfiguration
      domainGate: {
        minKeywordHits: 2,              // erforderliche Treffer in der Heuristik
        classifierModel: 'gpt-4o-mini', // strenger Intent-Klassifikator
        classifierMaxTokens: 3,
        classifierTemperature: 0
      }
    };

    // NEU: IT-Keyword-Allowlist für Heuristik
    this.IT_KEYWORDS = [
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
      // Helpdesk
      'ticket','incident','störung','fehlermeldung','log','stacktrace','monitoring','grafana','prometheus','sentry',
      // Drucker/Hardware
      'drucker','druckertreiber','scanner','toner','hdmi','ssd','ram','netzteil','monitor','peripherie',
      // Allgemeine IT-Begriffe
      'auth','login','anmeldung','berechtigung','zugriff','backup','restore','deployment','build','compile','performance'
    ];
  }

  // --- Hilfsfunktionen ------------------------------------------------------

  detectLang(text) {
    const t = (text || '').toLowerCase();
    if (/[а-яё]/.test(t)) return 'ru';
    // sehr einfache Heuristik für EN vs DE
    if (/[a-z]/.test(t) && /the|and|please|how|error|issue|login|network/i.test(text)) return 'en';
    return 'de';
  }

  async isITIntent(userMessage, conversationHistory = []) {
    const text = (userMessage || '').toLowerCase();

    // Heuristik: Keyword-Hits zählen
    const hits = this.IT_KEYWORDS.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
    if (hits >= this.config.domainGate.minKeywordHits) return true;

    // Fallback: strikter LLM-Klassifikator
    try {
      const cls = await this.openai.chat.completions.create({
        model: this.config.domainGate.classifierModel,
        temperature: this.config.domainGate.classifierTemperature,
        max_tokens: this.config.domainGate.classifierMaxTokens,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        messages: [{
          role: 'system',
          content: [
            'Du bist ein strenger Intent-Klassifikator.',
            'Ziel: Bestimme, ob die NACHRICHT ein IT-spezifisches Anliegen ist (IT-Betrieb, Support, Software, Hardware, Netzwerk, Security, Dev/DevOps, Accounts, E-Mail, Helpdesk).',
            'Antworte EXAKT mit einem Wort: IT oder NON-IT.',
            'Keine Begründung, keine Beispiele, keine Zusatzwörter.'
          ].join('\n')
        }, {
          role: 'user',
          content: `NACHRICHT:\n"""${userMessage}"""`
        }]
      });

      const label = (cls.choices[0].message.content || '').trim().toUpperCase();
      return label === 'IT';
    } catch (e) {
      // Bei Fehler konservativ blocken
      console.warn('[AI-Service] Klassifikator-Fehler, blocke konservativ:', e?.message);
      return false;
    }
  }

  // --- Wissensbasis-Suche ---------------------------------------------------

  /**
   * Sucht nach passenden Lösungen in der Datenbank
   * @param {string} query - Suchanfrage des Benutzers
   * @param {number} limit - Maximale Anzahl der Ergebnisse
   * @returns {Array} Array von Solution-Objekten
   */
  async searchSolutions(query, limit = 5) {
    try {
      let solutions = [];

      // Strategie 1: Volltextsuche
      try {
        solutions = await Solution.find({
          isActive: true,
          $text: { $search: query }
        })
          .select('title problem solution category priority keywords')
          .sort({ score: { $meta: 'textScore' }, updatedAt: -1 })
          .limit(limit);

        if (solutions.length > 0) {
          return solutions;
        }
      } catch (textSearchError) {
        console.log('[AI-Service] Volltextsuche nicht verfügbar, verwende Alternative');
      }

      // Strategie 2: Regex-Suchen
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);

      // Titel-Suche
      let titleMatches = await Solution.find({
        isActive: true,
        title: { $regex: query, $options: 'i' }
      })
        .select('title problem solution category priority keywords')
        .sort({ updatedAt: -1 })
        .limit(limit);

      // Problem-Suche
      let problemMatches = await Solution.find({
        isActive: true,
        problem: { $regex: query, $options: 'i' }
      })
        .select('title problem solution category priority keywords')
        .sort({ updatedAt: -1 })
        .limit(limit);

      // Keywords-Suche
      let keywordMatches = [];
      if (searchTerms.length > 0) {
        keywordMatches = await Solution.find({
          isActive: true,
          keywords: { $in: searchTerms.map(term => new RegExp(term, 'i')) }
        })
          .select('title problem solution category priority keywords')
          .sort({ updatedAt: -1 })
          .limit(limit);
      }

      // Kombinieren + Deduplizieren
      const combinedResults = [...titleMatches, ...problemMatches, ...keywordMatches];
      const uniqueResults = combinedResults.filter((solution, index, self) =>
        index === self.findIndex(s => s._id.toString() === solution._id.toString())
      );

      return uniqueResults.slice(0, limit);
    } catch (error) {
      console.error('[AI-Service] Fehler bei der Lösungssuche:', error);
      return [];
    }
  }

  // --- Antwortgenerierung ---------------------------------------------------

  /**
   * Generiert eine intelligente Antwort basierend auf Benutzereingabe
   * @param {string} userMessage - Nachricht des Benutzers
   * @param {Array} conversationHistory - Verlauf des Gesprächs
   * @returns {Object} Response-Objekt mit Antwort und Metadaten
   */
  async generateResponse(userMessage, conversationHistory = []) {
    try {
      // NEU: Domänen-Gate (frühzeitig)
      const isIT = await this.isITIntent(userMessage, conversationHistory);
      if (!isIT) {
        const lang = this.detectLang(userMessage);
        const msg = {
          de: 'Ich beantworte ausschließlich IT-spezifische Anfragen (z. B. Login, Software, Netzwerk, Hardware, Dev/DevOps).',
          en: 'I only handle IT-specific requests (e.g., login, software, network, hardware, Dev/DevOps).',
          ru: 'Я отвечаю только на ИТ-запросы (логин, софт, сеть, железо, Dev/DevOps).'
        }[lang];
        return {
          type: 'out_of_scope',
          message: msg,
          shouldCreateTicket: false,
          metadata: { domainGate: 'blocked' }
        };
      }

      // Vorab: Sensible/Eskalations-Keywords
      const sensitiveKeywords = [
        // Lizenz / Schlüssel
        'lizenz','license','lizenzschlüssel','serial','produktschlüssel','license key',
        // Private / vertrauliche Daten
        'kundendaten','client data','private daten','personenbezogen','personal data','pii','gehaltsdaten','salary','sozialversicherungs',
        // Credentials / Secrets
        'passwort','password','apikey','api key','token','secret','schlüssel','key=','auth token',
        // Defekt / kritisch
        'kaputt','defekt','broken','funktioniert nicht','geht nicht','crash','abgestürzt','nicht erreichbar','down','ausfall',
        // Wunsch nach Ticket / Techniker
        'techniker','admin bitte','bitte ticket','ticket erstellen','create ticket','support ticket'
      ];
      const lowerUser = userMessage.toLowerCase();
      const matchedSensitive = sensitiveKeywords.filter(k => lowerUser.includes(k));
      const needsImmediateEscalation = matchedSensitive.length > 0;
      if (needsImmediateEscalation) {
        console.log('[AI-Service] Sensitive/Escalation Trigger erkannt:', matchedSensitive);
      }

      // Schritt 1: Nach vorhandenen Lösungen suchen (nur wenn keine Sofort-Eskalation)
      const solutions = needsImmediateEscalation ? [] : await this.searchSolutions(userMessage, this.config.maxSolutionsInContext);

      let systemPrompt;
      let responseType;
      let relatedSolutions = [];

      if (needsImmediateEscalation) {
        responseType = 'escalation_required';
        systemPrompt = `# Rolle "ScooBot" – Sofortige Eskalation
Die Benutzeranfrage erfordert wegen sensibler Inhalte / fehlender Rechte / defekter Systeme oder explizitem Ticket-Wunsch eine schnelle Übergabe an den Support.

## Ziel
Antworte sehr kurz (<= 50 Wörter) und ermutige zur Ticket-Erstellung. Keine technischen Spekulationen. Keine sensiblen Daten. 
WICHTIG: Antworte NUR auf IT-spezifische Anfragen. Wenn nicht IT: Knapp sagen "Ich beantworte ausschließlich IT-spezifische Anfragen." – sonst nichts.

## Sprache
Ermittle Sprache der letzten Benutzer-Nachricht (DE/EN/RU). Antworte in dieser Sprache. Falls unklar: Deutsch.

## Struktur (eine knappe zusammenhängende Antwort, optional 1 Emoji):
1. Kurzer Hinweis, dass das Thema manuelle Prüfung/Berechtigung verlangt.
2. Direkte Aufforderung, ein Ticket zu erstellen.
3. Bitte um relevante Details (Screenshots, Fehlermeldung, Zeitpunkt).

Nur die Antwort ausgeben.`;
      } else if (solutions.length > 0) {
        // Lösungen gefunden - Kontext bauen
        responseType = 'solution_found';
        relatedSolutions = solutions;

        const solutionsContext = solutions.map((sol, index) =>
          `Lösung ${index + 1}:
Titel: ${sol.title}
Problem: ${sol.problem}
Lösung: ${sol.solution}
Kategorie: ${sol.category}
---`
        ).join('\n\n');

        systemPrompt = `# Persona & Stil
Du bist "ScooBot", ein interaktiver, freundlicher KI-Helpdesk-Assistent der ScooTeq GmbH. Du erklärst verständlich, vermeidest Fachjargon und klingst positiv.

# Sprache
Erkenne automatisch die Sprache der letzten Benutzer-Nachricht (DE bevorzugt; EN/RU möglich). Antworte in derselben Sprache. Max. 80 Wörter (Listenpunkte zählen nicht, bleibe trotzdem kompakt).

# Kontext (interne Wissensbasis – NICHT wortgleich wiederholen)
${solutionsContext}

# Wichtige Regeln
1. Keine sensiblen Daten (Passwörter, Keys, PII).
2. Lösung NIEMALS wortgleich kopieren – stets umformulieren.
3. Anleitung als nummerierte Liste:
   1. Öffne …
   2. Klicke …
   3. Prüfe …
4. Wenn nur teilweise passend: Kurz kennzeichnen, Schritte anpassen, Ticket als Option anbieten.
5. Nichts erfinden. Bei Unsicherheit: Ticket empfehlen.
6. **Strikte Domäne:** Antworte NUR auf IT-Themen. Wenn nicht IT: Antworte knapp "Ich beantworte ausschließlich IT-spezifische Anfragen." und sonst nichts.

# Ablauf
1. Problem analysieren.
2. Passende Lösung aus Kontext wählen/ableiten.
3. Ausgabeformate:
   - Passend: 1 Satz Einleitung + nummerierte Liste.
   - Unsicherheit: 1 Satz + 1–2 sichere generische Schritte + Ticket-Hinweis.

# Ausgabe
Nur die eigentliche Antwort.`;
      } else {
        // Keine Lösungen gefunden
        responseType = 'no_solution_found';
        systemPrompt = `# Persona
Du bist "ScooBot" – interaktiv, freundlich, knapp. Keine Lösung in der Wissensbasis gefunden.

# Sprache
Sprache spiegeln (DE/EN/RU). <= 80 Wörter.

# Verhalten Wenn Keine Lösung
1. Kurzer empathischer Satz: aktuell keine direkte Lösung.
2. 1–2 sinnvolle, sichere Vorschläge (z. B. App/PC neu starten, Verbindung prüfen) – nur unbedenklich.
3. Hinweis: Falls weiter Probleme bestehen -> Ticket erstellen.
4. Keine sensiblen Daten, nichts erfinden.
5. **Strikte Domäne:** Nur IT-Themen beantworten. Wenn nicht IT: Knapp ablehnen.

# Ausgabe
Nur die Antwort, kein Meta.`;
      }

      // Gesprächsverlauf begrenzen (letzte 6 Nachrichten)
      const limitedHistory = conversationHistory.slice(-6);

      // Messages für OpenAI vorbereiten
      const messages = [
        { role: 'system', content: systemPrompt },
        ...limitedHistory,
        { role: 'user', content: userMessage }
      ];

      console.log(`[AI-Service] Sende Anfrage an OpenAI (${this.config.model})`);

      // OpenAI API Aufruf
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        frequency_penalty: 0.2,  // leichtes "Anti-Plaudern"
        presence_penalty: 0.0
      });

      const aiResponse = completion.choices[0].message.content;

      // Prüfen ob Ticket-Erstellung empfohlen wird
      const shouldCreateTicket =
        responseType === 'no_solution_found' ||
        responseType === 'escalation_required' ||
        this.shouldRecommendTicket(aiResponse, userMessage) ||
        needsImmediateEscalation;

      if (shouldCreateTicket) {
        console.log('[AI-Service] shouldCreateTicket=true', { responseType, needsImmediateEscalation, userMessage });
      }

      console.log(`[AI-Service] Antwort generiert (${completion.usage?.total_tokens || 'N/A'} tokens)`);

      return {
        type: responseType,
        message: aiResponse,
        relatedSolutions: relatedSolutions,
        shouldCreateTicket: shouldCreateTicket,
        metadata: {
          tokensUsed: completion.usage?.total_tokens || 0,
          model: this.config.model,
          solutionsFound: solutions.length
        }
      };

    } catch (error) {
      console.error('[AI-Service] Fehler bei der Antwortgenerierung:', error);

      return {
        type: 'error',
        message: 'Entschuldigung, es gab einen technischen Fehler. Bitte versuchen Sie es erneut oder erstellen Sie ein Support-Ticket für weitere Hilfe.',
        shouldCreateTicket: true,
        metadata: {
          error: error.message
        }
      };
    }
  }

  // --- Analyse & Klassifikation --------------------------------------------

  /**
   * Analysiert die Priorität eines Problems
   * @param {string} message - Benutzer-Nachricht
   * @returns {string} Prioritätslevel (Low, Medium, High)
   */
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
        }, {
          role: 'user',
          content: message
        }]
      });

      const priority = (completion.choices[0].message.content || '').trim();
      return ['Low', 'Medium', 'High'].includes(priority) ? priority : 'Medium';

    } catch (error) {
      console.error('[AI-Service] Fehler bei Prioritätsanalyse:', error);
      return 'Medium';
    }
  }

  /**
   * Kategorisiert ein Problem automatisch
   * @param {string} message - Benutzer-Nachricht
   * @returns {string} Kategorie
   */
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
        }, {
          role: 'user',
          content: message
        }]
      });

      const category = (completion.choices[0].message.content || '').trim();
      const validCategories = ['Hardware', 'Software', 'Netzwerk', 'Account', 'Email', 'Sonstiges'];
      return validCategories.includes(category) ? category : 'Sonstiges';

    } catch (error) {
      console.error('[AI-Service] Fehler bei Kategorisierung:', error);
      return 'Sonstiges';
    }
  }

  /**
   * Prüft ob ein Ticket empfohlen werden sollte
   * @param {string} aiResponse - AI-Antwort
   * @param {string} userMessage - Original Benutzer-Nachricht
   * @returns {boolean} True wenn Ticket empfohlen wird
   */
  shouldRecommendTicket(aiResponse, userMessage) {
    const ticketKeywords = [
      'ticket erstellen',
      'support-ticket',
      'weitere hilfe',
      'techniker kontaktieren',
      'spezialist',
      'kann nicht gelöst werden',
      'komplexes problem',
      'administrator',
      'keine lösung'
    ];

    const responseText = (aiResponse || '').toLowerCase();
    const hasTicketKeyword = ticketKeywords.some(keyword => responseText.includes(keyword));

    // Komplexitäts-Indikatoren in der ursprünglichen Nachricht
    const complexityKeywords = [
      'mehrere probleme',
      'seit wochen',
      'immer wieder',
      'kritisch',
      'dringend',
      'produktionsausfall'
    ];

    const userText = (userMessage || '').toLowerCase();
    const isComplexIssue = complexityKeywords.some(keyword => userText.includes(keyword));

    return hasTicketKeyword || isComplexIssue;
  }

  // --- Konfig & Verbindung --------------------------------------------------

  isConfigured() {
    return !!process.env.OPENAI_API_KEY;
  }

  async testConnection() {
    try {
      if (!this.isConfigured()) {
        throw new Error('OpenAI API Key nicht konfiguriert');
      }

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
        response: completion.choices[0].message.content
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
