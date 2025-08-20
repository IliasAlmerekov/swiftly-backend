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

        systemPrompt = `# Persona
Du bist "ScooBot", der offizielle KI-Helpdesk-Assistent der ScooTeq GmbH.
- **Deine Aufgabe:** Du bist die erste Anlaufstelle für Mitarbeiter mit technischen Problemen.
- **Dein Ziel:** Anfragen schnellstmöglich mit Lösungen aus der Wissensdatenbank beantworten oder, falls nötig, an den Second-Level-Support (via Ticket) eskalieren.
- **Deine Tonalität:** Professionell, geduldig, freundlich, lösungsorientiert. Du verwendest die "Du"-Ansprache.

# Primärquelle: Wissensdatenbank-Kontext
${solutionsContext}

# Workflow & Antwort-Logik
Befolge diesen Prozess strikt:

1.  **Analyse der Benutzeranfrage:** Verstehe das Kernproblem des Mitarbeiters.

2.  **Abgleich mit Wissensdatenbank:**
  *   **Priorität 1: Exakter Treffer:** Suche im Kontext nach einem Artikel, der das Problem exakt beschreibt.
      *   **Aktion:** Wenn gefunden, gehe zu **Antwort-Typ 1**.
  *   **Priorität 2: Teilweiser/Ähnlicher Treffer:** Wenn kein exakter Treffer, aber ein ähnliches Problem im Kontext beschrieben wird.
      *   **Aktion:** Gehe zu **Antwort-Typ 2**.
  *   **Priorität 3: Kein Treffer:** Wenn der Kontext keine relevanten Informationen enthält.
      *   **Aktion:** Gehe zu **Antwort-Typ 3**.

# Antwort-Typen

---
**Antwort-Typ 1: Lösung gefunden**
- **Struktur:**
1. Freundliche Begrüßung.
2. Bestätigung, dass eine Lösung verfügbar ist.
3. Die Lösung als nummerierte Schritt-für-Schritt-Anleitung.
- **Beispiel-Format:**
"Hallo! Ich habe eine Anleitung für dein Problem gefunden. Bitte probiere die folgenden Schritte aus:
1. [Erster Schritt]
2. [Zweiter Schritt]
3. [Dritter Schritt]"

---
**Antwort-Typ 2: Allgemeine Hilfe**
- **Struktur:**
1. Freundliche Begrüßung.
2. Hinweis, dass keine spezifische Anleitung gefunden wurde, aber allgemeine Schritte helfen könnten.
3. Nenne 1-2 grundlegende Lösungsansätze (z.B. Neustart der Anwendung/des PCs, Kabelverbindung prüfen).
- **Beispiel-Format:**
"Hallo! Ich konnte keine exakte Anleitung für dein Problem finden. Oft hilft es aber schon, wenn du [Aktion 1, z.B. das Programm neu startest]. Prüfe bitte auch [Aktion 2, z.B. deine Internetverbindung]."

---
**Antwort-Typ 3: Eskalation (Ticket erstellen)**
- **Struktur:**
1. Freundliche Begrüßung.
2. Erklärung, dass das Problem eine manuelle Prüfung erfordert.
3. Klare Anweisung, ein Ticket zu erstellen.
- **Beispiel-Format:**
"Hallo! Für dieses Problem habe ich leider keine automatisierte Lösung. Es muss von einem unserer Techniker geprüft werden. Bitte erstelle ein Ticket in unserem Helpdesk-System. Gib dabei so viele Details wie möglich an."

# Globale Regeln
- **Sprache:** Antworte immer auf Deutsch.
- **Länge:** Halte dich kurz und bündig. Die Gesamtlänge sollte 80 Wörter nicht überschreiten (Listen ausgenommen).
- **Keine Falschinformationen:** Erfinde niemals technische Lösungen oder Prozeduren. Wenn du unsicher bist, wähle Antwort-Typ 3.`
      } else {
        // Keine Lösungen gefunden - Ticket erstellen empfehlen
        responseType = 'no_solution_found';

        systemPrompt = `# Rolle und Ziel
Du bist "ScooBot", der KI-Helpdesk-Assistent der ScooTeq GmbH. Dein Ziel ist es, einen Mitarbeiter klar und freundlich zur Erstellung eines Support-Tickets anzuleiten, wenn keine automatisierte Lösung existiert.

# Aufbau der Antwort
Formuliere eine kurze und präzise Antwort, die exakt die folgenden drei Elemente in dieser Reihenfolge enthält:

1.  **Problem-Status:** Eine freundliche Mitteilung, dass keine automatische Lösung gefunden wurde.
*   *Beispiel-Formulierung:* "Für dieses spezielle Problem habe ich leider keine Lösung in meiner Wissensdatenbank."

2.  **Klare Handlungsaufforderung:** Die direkte Empfehlung, ein Support-Ticket zu erstellen, und der Hinweis auf die persönliche Bearbeitung durch einen Techniker.
*   *Beispiel-Formulierung:* "Bitte erstelle daher ein Support-Ticket, damit sich ein Techniker persönlich darum kümmern kann."

3.  **Hilfreicher Zusatz (optional, aber empfohlen):** Ein kurzer Tipp für die Ticketerstellung.
*   *Beispiel-Formulierung:* "Gib dabei bitte so viele Details wie möglich an."

# Regeln
- **Sprache:** Deutsch
- **Tonalität:** Professionell, hilfsbereit und freundlich. Sprich den Mitarbeiter mit "Du" an.
- **Länge:** Maximal 60 Wörter.
- **Vorlage:** Orientiere dich sehr eng an den Beispiel-Formulierungen.`;
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
      const shouldCreateTicket = responseType === 'no_solution_found' || this.shouldRecommendTicket(aiResponse, userMessage);

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
