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
      maxSolutionsInContext: 3
    };
  }

  /**
   * Sucht nach passenden Lösungen in der Datenbank
   * @param {string} query - Suchanfrage des Benutzers
   * @param {number} limit - Maximale Anzahl der Ergebnisse
   * @returns {Array} Array von Solution-Objekten
   */
  async searchSolutions(query, limit = 5) {
    try {
      let solutions = [];

      // Strategie 1: Versuche Volltextsuche (wenn Text-Index verfügbar)
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

      // Strategie 2: Separate Regex-Suchen (falls Volltextsuche fehlschlägt)
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

      // Keywords-Suche (vereinfacht)
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

      // Ergebnisse kombinieren und Duplikate entfernen
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

  /**
   * Generiert eine intelligente Antwort basierend auf Benutzereingabe
   * @param {string} userMessage - Nachricht des Benutzers
   * @param {Array} conversationHistory - Verlauf des Gesprächs
   * @returns {Object} Response-Objekt mit Antwort und Metadaten
   */
  async generateResponse(userMessage, conversationHistory = []) {
    try {
      // Vorab: Prüfe ob Anfrage sensibel ist und sofortige Eskalation/Ticket erfordert
      const sensitiveKeywords = [
        // Lizenz / Schlüssel
        'lizenz', 'license', 'lizenzschlüssel', 'serial', 'produktschlüssel', 'license key',
        // Private / vertrauliche Daten
        'kundendaten', 'client data', 'private daten', 'personenbezogen', 'personal data', 'pii', 'gehaltsdaten', 'salary', 'sozialversicherungs',
        // Credentials / Secrets
        'passwort', 'password', 'apikey', 'api key', 'token', 'secret', 'schlüssel', 'key=', 'auth token',
        // Defekt / kritisch
        'kaputt', 'defekt', 'broken', 'funktioniert nicht', 'geht nicht', 'crash', 'abgestürzt', 'nicht erreichbar', 'down', 'ausfall',
        // Wunsch nach Ticket / Techniker
        'techniker', 'admin bitte', 'bitte ticket', 'ticket erstellen', 'create ticket', 'support ticket'
      ];
      const lowerUser = userMessage.toLowerCase();
      const matchedSensitive = sensitiveKeywords.filter(k => lowerUser.includes(k));
      const needsImmediateEscalation = matchedSensitive.length > 0;
      if (needsImmediateEscalation) {
        console.log('[AI-Service] Sensitive/Escalation Trigger erkannt:', matchedSensitive);
      }

      // Schritt 1: Nach vorhandenen Lösungen suchen
      const solutions = needsImmediateEscalation ? [] : await this.searchSolutions(userMessage, this.config.maxSolutionsInContext);

      let systemPrompt;
      let responseType;
      let relatedSolutions = [];

  if (needsImmediateEscalation) {
    responseType = 'escalation_required';
    systemPrompt = `# Rolle "ScooBot" – Sofortige Eskalation
Die Benutzeranfrage erfordert wegen sensibler Inhalte / fehlender Rechte / defekter Systeme oder explizitem Ticket-Wunsch eine schnelle Übergabe an den Support.

## Ziel
Antworte sehr kurz (<= 50 Wörter) und ermutige zur Ticket-Erstellung. Keine technischen Spekulationen. Leake keinerlei vertrauliche, personenbezogene oder sicherheitsrelevante Daten. Teile keine Passwörter, Keys, Lizenzschlüssel oder interne Informationen. Formuliere freundlich, klar, motivierend.
Antworte nur auf IT-spezifische Anfragen und nicht auf allgemeine Fragen. Wenn du unsicher bist, empfehle bitte die Erstellung eines Tickets und antworte nicht auf die Fragen, die gar nicht in deinen Bereich fallen.

## Sprache
Ermittle Sprache der letzten Benutzer-Nachricht (deutsch / englisch / russisch). Antworte in dieser Sprache. Falls unklar: Deutsch.

## Struktur (eine knappe zusammenhängende Antwort, optional 1 Emoji am Ende):
1. Kurzer Hinweis, dass das Thema manuelle Prüfung oder Berechtigung verlangt.
2. Direkte Aufforderung ein Ticket zu erstellen ("Erstelle bitte ein Ticket" / EN: "Please create a ticket" / RU: "Создай, пожалуйста, тикет").
3. Bitte um relevante Details (Screenshots, Fehlermeldung, Zeitpunkt).

Keine Liste wenn nicht nötig, kein Copy der Original-Anfrage, nichts erfinden.`;
  } else if (solutions.length > 0) {
        // Lösungen gefunden - erstelle Kontext
        responseType = 'solution_found';
        relatedSolutions = solutions;

        const solutionsContext = solutions
          .map((sol, index) => 
            `Lösung ${index + 1}:
Titel: ${sol.title}
Problem: ${sol.problem}
Lösung: ${sol.solution}
Kategorie: ${sol.category}
---`
          ).join('\n\n');

  systemPrompt = `# Persona & Stil
Du bist "ScooBot", ein interaktiver, freundlicher KI-Helpdesk-Assistent der ScooTeq GmbH. Du erklärst verständlich, vermeidest Fachjargon und klingst positiv und proaktiv.

# Sprache
Erkenne automatisch die Sprache der letzten Benutzer-Nachricht (Deutsch bevorzugt; unterstütze auch Englisch oder Russisch). Antworte in derselben Sprache. Falls Mischung: Deutsch. Max. 80 Wörter (Listenpunkte zählen nicht in das Wortlimit, aber sei trotzdem kompakt).

# Kontext (interne Wissensbasis – NICHT wortgleich wiederholen, sondern umformulieren!)
${solutionsContext}

# Wichtige Regeln
1. Keine sensiblen Daten, keine Passwörter, Keys, Lizenzschlüssel, personenbezogene oder vertrauliche Kundendaten herausgeben. Falls danach gefragt wird, antworte kreativ kurz, dass du das nicht weißt / nicht darfst und biete Ticket an.
2. Lösung NIE wortgleich kopieren – stets umformulieren in alltagsnaher, nicht technischen Sprache.
3. Schritt-für-Schritt immer als klare nummerierte Liste:
   1. Öffne ...
   2. Klicke ...
   3. Prüfe ...
4. Wenn Lösung nur teilweise passt: Kurzen Hinweis + Liste anpassen + optionaler Vorschlag zur Ticket-Erstellung, falls unklar.
5. Sei interaktiv: sehr knapp, aber lebendig (max 1 Emoji optional am Ende, nur wenn natürlich). Keine überflüssigen Floskeln.
6. Erfinde nichts. Wenn unsicher -> kurze höfliche Empfehlung Ticket zu erstellen.

# Ablauf
1. Analysiere Problem.
2. Prüfe, ob eine der bereitgestellten Lösungen (Kontext) exakt oder ähnlich passt.
3. Ausgabeformate:
   - Exakte oder teilweise Lösung: Kurze Einleitung (1 Satz), dann nummerierte Liste mit umformulierter Anleitung.
   - Unsicherheit / unvollständig: 1 kurzer Satz + 1-2 generische sichere Troubleshooting-Schritte + Hinweis auf Ticket-Möglichkeit.

# Ausgabe
Nur die eigentliche Antwort ohne zusätzliche Meta-Kommentare.`
      } else {
        // Keine Lösungen gefunden - Ticket erstellen empfehlen
        responseType = 'no_solution_found';
  systemPrompt = `# Persona
Du bist "ScooBot" – interaktiv, freundlich, knapp. Keine Lösung in der Wissensbasis gefunden.

# Sprache
Automatische Spracherkennung (DE bevorzugt; EN/RU möglich). Antworte in Sprache des Benutzers. <= 80 Wörter.

# Verhalten Wenn Keine Lösung
1. Kurzer empathischer Satz: dass du gerade keine direkte Lösung hast.
2. 1-2 sinnvolle generische, sichere Vorschläge (z.B. Anwendung neu starten, Verbindung prüfen) – nur wenn unbedenklich.
3. Hinweis: Wenn das nicht hilft / weiterhin Problem besteht -> Ticket erstellen anbieten.
4. Keine starren Phrasen; formuliere lebendig und variabel.
5. Keine sensiblen Daten preisgeben; bei Nachfrage danach: sag kreativ, dass du das nicht liefern darfst.
6. Optional max 1 Emoji.

# Ausgabe
Nur die Antwort, kein Meta.`;
      }

      // Gesprächsverlauf begrenzen (letzte 6 Nachrichten)
      const limitedHistory = conversationHistory.slice(-6);

      // Messages für OpenAI vorbereiten
      const messages = [
        { role: "system", content: systemPrompt },
        ...limitedHistory,
        { role: "user", content: userMessage }
      ];

      console.log(`[AI-Service] Sende Anfrage an OpenAI (${this.config.model})`);

      // OpenAI API Aufruf
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      });

      const aiResponse = completion.choices[0].message.content;

      // Prüfen ob Ticket-Erstellung empfohlen wird
      const shouldCreateTicket = responseType === 'no_solution_found' || responseType === 'escalation_required' || this.shouldRecommendTicket(aiResponse, userMessage) || needsImmediateEscalation;
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

  /**
   * Analysiert die Priorität eines Problems
   * @param {string} message - Benutzer-Nachricht
   * @returns {string} Prioritätslevel (Low, Medium, High)
   */
  async analyzePriority(message) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [{
          role: "system",
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
          role: "user",
          content: message
        }],
        max_tokens: 10,
        temperature: 0.3
      });

      const priority = completion.choices[0].message.content.trim();
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
        messages: [{
          role: "system",
          content: `Kategorisiere dieses Problem in eine der folgenden Kategorien:
- Hardware: Physische Geräte, Computer, Drucker, etc.
- Software: Programme, Apps, Betriebssysteme
- Netzwerk: Internet, WLAN, Verbindungsprobleme
- Account: Login-Probleme, Passwörter, Benutzerkonten
- Email: E-Mail-Probleme, Outlook, etc.
- Sonstiges: Alles andere

Antworte nur mit der Kategorie.`
        }, {
          role: "user",
          content: message
        }],
        max_tokens: 10,
        temperature: 0.2
      });

      const category = completion.choices[0].message.content.trim();
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
      'keine Lösung'
    ];

    const responseText = aiResponse.toLowerCase();
    const hasTicketKeyword = ticketKeywords.some(keyword => 
      responseText.includes(keyword)
    );

    // Prüfe auch auf komplexe Probleme in der Benutzer-Nachricht
    const complexityKeywords = [
      'mehrere probleme',
      'seit wochen',
      'immer wieder',
      'kritisch',
      'dringend',
      'produktionsausfall'
    ];

    const userText = userMessage.toLowerCase();
    const isComplexIssue = complexityKeywords.some(keyword => 
      userText.includes(keyword)
    );

    return hasTicketKeyword || isComplexIssue;
  }

  /**
   * Validiert die OpenAI Konfiguration
   * @returns {boolean} True wenn korrekt konfiguriert
   */
  isConfigured() {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * Testet die Verbindung zu OpenAI
   * @returns {Object} Test-Ergebnis
   */
  async testConnection() {
    try {
      if (!this.isConfigured()) {
        throw new Error('OpenAI API Key nicht konfiguriert');
      }

      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [{ role: "user", content: "Hallo" }],
        max_tokens: 10
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
