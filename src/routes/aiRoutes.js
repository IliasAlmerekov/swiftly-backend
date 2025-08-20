import express from 'express';
import aiService from '../services/aiService.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Middleware für alle AI Routes - Authentifizierung erforderlich
router.use(authMiddleware);

// Temporärer In-Memory Store für Konversationen (in Produktion Redis verwenden)
const conversationStore = new Map();

/**
 * @route   POST /api/ai/chat
 * @desc    Chat mit AI-Assistent
 * @body    { message, sessionId }
 * @access  Private
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    // Validierung
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nachricht ist erforderlich'
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session-ID ist erforderlich'
      });
    }

    // Gesprächsverlauf abrufen oder erstellen
    let conversationHistory = conversationStore.get(sessionId) || [];
    
    console.log(`[AI-Chat] Neue Nachricht von Session ${sessionId}: "${message}"`);

    // AI-Antwort generieren
    const response = await aiService.generateResponse(message.trim(), conversationHistory);
    
    // Konversationsverlauf aktualisieren
    conversationHistory.push(
      { role: "user", content: message.trim() },
      { role: "assistant", content: response.message }
    );
    
    // Verlauf auf die letzten 20 Nachrichten begrenzen (10 Paare)
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }
    
    // Konversation speichern
    conversationStore.set(sessionId, conversationHistory);

    res.json({
      success: true,
      data: {
        message: response.message,
        type: response.type,
        shouldCreateTicket: response.shouldCreateTicket,
        relatedSolutions: response.relatedSolutions || [],
        metadata: response.metadata || {}
      }
    });

  } catch (error) {
    console.error('[AI-Chat] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Verarbeiten der Anfrage',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/ai/analyze-priority
 * @desc    Analysiert die Priorität einer Nachricht
 * @body    { message }
 * @access  Private
 */
router.post('/analyze-priority', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Nachricht ist erforderlich'
      });
    }

    const priority = await aiService.analyzePriority(message.trim());
    
    res.json({
      success: true,
      data: {
        priority,
        message: message.trim()
      }
    });

  } catch (error) {
    console.error('[AI-Priority] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Prioritätsanalyse',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/ai/categorize
 * @desc    Kategorisiert ein Problem automatisch
 * @body    { message }
 * @access  Private
 */
router.post('/categorize', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Nachricht ist erforderlich'
      });
    }

    const category = await aiService.categorizeIssue(message.trim());
    
    res.json({
      success: true,
      data: {
        category,
        message: message.trim()
      }
    });

  } catch (error) {
    console.error('[AI-Categorize] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Kategorisierung',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/ai/conversation/:sessionId
 * @desc    Löscht eine Konversation
 * @param   sessionId - Session ID der Konversation
 * @access  Private
 */
router.delete('/conversation/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (conversationStore.has(sessionId)) {
      conversationStore.delete(sessionId);
      console.log(`[AI-Chat] Konversation ${sessionId} gelöscht`);
    }
    
    res.json({
      success: true,
      message: 'Konversation erfolgreich gelöscht'
    });

  } catch (error) {
    console.error('[AI-Chat] Fehler beim Löschen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Konversation'
    });
  }
});

/**
 * @route   GET /api/ai/status
 * @desc    Prüft den Status des AI-Service
 * @access  Private
 */
router.get('/status', async (req, res) => {
  try {
    const isConfigured = aiService.isConfigured();
    
    if (!isConfigured) {
      return res.status(503).json({
        success: false,
        message: 'AI-Service nicht konfiguriert',
        data: {
          configured: false,
          activeConversations: conversationStore.size
        }
      });
    }

    // Verbindungstest (optional, kann auskommentiert werden um API-Kosten zu sparen)
    // const connectionTest = await aiService.testConnection();

    res.json({
      success: true,
      message: 'AI-Service ist verfügbar',
      data: {
        configured: true,
        activeConversations: conversationStore.size,
        // connectionTest: connectionTest
      }
    });

  } catch (error) {
    console.error('[AI-Status] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Statuscheck',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/ai/test-connection
 * @desc    Testet die Verbindung zu OpenAI (nur für Entwicklung/Tests)
 * @access  Private
 */
router.post('/test-connection', async (req, res) => {
  try {
    const testResult = await aiService.testConnection();
    
    if (testResult.success) {
      res.json({
        success: true,
        message: 'OpenAI Verbindung erfolgreich getestet',
        data: testResult
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'OpenAI Verbindung fehlgeschlagen',
        data: testResult
      });
    }

  } catch (error) {
    console.error('[AI-Test] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Verbindungstest',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
