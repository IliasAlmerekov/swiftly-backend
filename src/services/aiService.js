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
      maxTokens: 300,
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
      console.log(`[AI-Service] Suche nach Lösungen für: "${query}"`);

      // Mehrere Suchstrategien kombinieren
      const solutions = await Solution.find({
        isActive: true,
        $or: [
          // Volltextsuche
          { $text: { $search: query } },
          // Titel-Suche (case-insensitive)
          { title: { $regex: query, $options: 'i' } },
          // Problem-Beschreibung-Suche
          { problem: { $regex: query, $options: 'i' } },
          // Keyword-Matching
          { keywords: { $elemMatch: { $regex: query, $options: 'i' } } }
        ]
      })
      .select('title problem solution category priority keywords')
      .limit(limit)
      .sort({ updatedAt: -1 }); // Neueste Lösungen zuerst

      console.log(`[AI-Service] ${solutions.length} Lösungen gefunden`);
      return solutions;

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
      console.log(`[AI-Service] Generiere Antwort für: "${userMessage}"`);

      // Schritt 1: Nach vorhandenen Lösungen suchen
      const solutions = await this.searchSolutions(userMessage, this.config.maxSolutionsInContext);

      let systemPrompt;
      let responseType;
      let relatedSolutions = [];

      if (solutions.length > 0) {
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

        systemPrompt = `Du bist ein professioneller Helpdesk-Assistent für ScooTeq. Deine Aufgabe ist es, Benutzern bei technischen Problemen zu helfen.

VERFÜGBARE LÖSUNGEN AUS DER WISSENSDATENBANK:
${solutionsContext}

ANWEISUNGEN:
1. Verwende die verfügbaren Lösungen um dem Benutzer zu helfen
2. Antworte auf Deutsch, freundlich und professionell
3. Wenn eine passende Lösung vorhanden ist, erkläre sie Schritt für Schritt
4. Wenn keine exakte Lösung passt, gib allgemeine Hilfestellung basierend auf ähnlichen Problemen
5. Wenn das Problem zu komplex ist, empfehle die Erstellung eines Tickets
6. Halte deine Antworten präzise (max. 250 Wörter)

Antworte jetzt auf die Benutzeranfrage basierend auf den verfügbaren Lösungen.`;

      } else {
        // Keine Lösungen gefunden - allgemeine Hilfe
        responseType = 'general_help';

        systemPrompt = `Du bist ein professioneller Helpdesk-Assistent für ScooTeq. 

SITUATION: Keine spezifische Lösung in der Wissensdatenbank gefunden.

ANWEISUNGEN:
1. Analysiere das Problem des Benutzers
2. Gib allgemeine Troubleshooting-Tipps wenn möglich
3. Stelle gezielte Nachfragen zur Problemdiagnose
4. Antworte auf Deutsch, freundlich und professionell
5. Wenn das Problem komplex erscheint, empfehle die Erstellung eines Support-Tickets
6. Halte deine Antworten hilfreich aber präzise (max. 200 Wörter)

Häufige Kategorien: Hardware, Software, Netzwerk, Account, Email`;
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
      const shouldCreateTicket = this.shouldRecommendTicket(aiResponse, userMessage);

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
      'administrator'
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
