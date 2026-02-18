import express from "express";
import { randomUUID } from "crypto";
import aiService from "../services/aiService.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { getAIRequestsStats } from "../controllers/aiController.js";
import { getRedisClient, isRedisEnabled } from "../config/redis.js";

const router = express.Router();

// Middleware for all AI routes - authentication required
router.use(authMiddleware);

// In-memory conversation store (use Redis in production)
const conversationStore = new Map();
const conversationKey = (userId, sessionId) =>
  `ai:conversation:${userId}:${sessionId}`;
const conversationTtlMs =
  Number(process.env.AI_CONVERSATION_TTL_MS) || 30 * 60 * 1000;

const getConversation = async (userId, sessionId) => {
  if (isRedisEnabled) {
    const client = await getRedisClient();
    const raw = await client.get(conversationKey(userId, sessionId));
    return raw ? JSON.parse(raw) : null;
  }
  return conversationStore.get(conversationKey(userId, sessionId)) || null;
};

const setConversation = async (userId, sessionId, entry) => {
  if (isRedisEnabled) {
    const client = await getRedisClient();
    const ttlSeconds = Math.max(1, Math.floor(conversationTtlMs / 1000));
    await client.set(
      conversationKey(userId, sessionId),
      JSON.stringify(entry),
      { EX: ttlSeconds }
    );
    return;
  }
  conversationStore.set(conversationKey(userId, sessionId), entry);
};

const deleteConversation = async (userId, sessionId) => {
  if (isRedisEnabled) {
    const client = await getRedisClient();
    await client.del(conversationKey(userId, sessionId));
    return;
  }
  conversationStore.delete(conversationKey(userId, sessionId));
};

const sweepConversations = () => {
  if (isRedisEnabled) return;
  const now = Date.now();
  for (const [key, entry] of conversationStore.entries()) {
    if (!entry || now - entry.updatedAt > conversationTtlMs) {
      conversationStore.delete(key);
    }
  }
};

setInterval(sweepConversations, Math.min(conversationTtlMs, 5 * 60 * 1000));

/**
 * @route   POST /api/ai/chat
 * @desc    Chat with AI assistant
 * @body    { message, sessionId }
 * @access  Private
 */
router.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    // Validation
    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Nachricht ist erforderlich",
      });
    }

    const userId = req.user?._id?.toString();
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Nicht autorisiert",
      });
    }

    // Get or create conversation history
    let effectiveSessionId = typeof sessionId === "string" ? sessionId : null;
    let stored = effectiveSessionId
      ? await getConversation(userId, effectiveSessionId)
      : null;
    if (!stored) {
      effectiveSessionId = randomUUID();
      stored = null;
    }
    let conversationHistory = stored?.history || [];

    console.log(
      `[AI-Chat] Neue Nachricht von Session ${effectiveSessionId} (len=${message.length})`
    );

    // Generate AI response
    const response = await aiService.generateResponse(
      message.trim(),
      conversationHistory
    );

    // Update conversation history
    conversationHistory.push(
      { role: "user", content: message.trim() },
      { role: "assistant", content: response.message }
    );

    // Keep only the last 20 messages (10 pairs)
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }

    // Persist conversation
    await setConversation(userId, effectiveSessionId, {
      history: conversationHistory,
      updatedAt: Date.now(),
    });

    res.json({
      success: true,
      data: {
        sessionId: effectiveSessionId,
        message: response.message,
        type: response.type,
        shouldCreateTicket: response.shouldCreateTicket,
        relatedSolutions: response.relatedSolutions || [],
        metadata: response.metadata || {},
      },
    });
  } catch (error) {
    console.error("[AI-Chat] Fehler:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Verarbeiten der Anfrage",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   POST /api/ai/analyze-priority
 * @desc    Analyze priority for a message
 * @body    { message }
 * @access  Private
 */
router.post("/analyze-priority", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        message: "Nachricht ist erforderlich",
      });
    }

    const priority = await aiService.analyzePriority(message.trim());

    res.json({
      success: true,
      data: {
        priority,
        message: message.trim(),
      },
    });
  } catch (error) {
    console.error("[AI-Priority] Fehler:", error);
    res.status(500).json({
      success: false,
      message: "Fehler bei der Prioritaetsanalyse",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   POST /api/ai/categorize
 * @desc    Categorize an issue automatically
 * @body    { message }
 * @access  Private
 */
router.post("/categorize", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        message: "Nachricht ist erforderlich",
      });
    }

    const category = await aiService.categorizeIssue(message.trim());

    res.json({
      success: true,
      data: {
        category,
        message: message.trim(),
      },
    });
  } catch (error) {
    console.error("[AI-Categorize] Fehler:", error);
    res.status(500).json({
      success: false,
      message: "Fehler bei der Kategorisierung",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   DELETE /api/ai/conversation/:sessionId
 * @desc    Delete a conversation
 * @param   sessionId - Session ID
 * @access  Private
 */
router.delete("/conversation/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?._id?.toString();
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Nicht autorisiert",
      });
    }

    await deleteConversation(userId, sessionId);
    console.log(
      `[AI-Chat] Konversation ${sessionId} geloescht (user=${userId})`
    );

    res.json({
      success: true,
      message: "Konversation erfolgreich geloescht",
    });
  } catch (error) {
    console.error("[AI-Chat] Fehler beim Loeschen:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Loeschen der Konversation",
    });
  }
});

/**
 * @route   GET /api/ai/status
 * @desc    Check AI service status
 * @access  Private
 */
router.get("/status", async (req, res) => {
  try {
    const isConfigured = aiService.isConfigured();

    if (!isConfigured) {
      return res.status(503).json({
        success: false,
        message: "AI-Service nicht konfiguriert",
        data: {
          configured: false,
          activeConversations: isRedisEnabled ? null : conversationStore.size,
        },
      });
    }

    // Connection test (optional)
    // const connectionTest = await aiService.testConnection();

    res.json({
      success: true,
      message: "AI-Service ist verfuegbar",
      data: {
        configured: true,
        activeConversations: isRedisEnabled ? null : conversationStore.size,
        // connectionTest: connectionTest
      },
    });
  } catch (error) {
    console.error("[AI-Status] Fehler:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Statuscheck",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   POST /api/ai/test-connection
 * @desc    Test OpenAI connection (dev/tests only)
 * @access  Private
 */
router.post("/test-connection", async (req, res) => {
  try {
    const testResult = await aiService.testConnection();

    if (testResult.success) {
      res.json({
        success: true,
        message: "OpenAI Verbindung erfolgreich getestet",
        data: testResult,
      });
    } else {
      res.status(503).json({
        success: false,
        message: "OpenAI Verbindung fehlgeschlagen",
        data: testResult,
      });
    }
  } catch (error) {
    console.error("[AI-Test] Fehler:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Verbindungstest",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.get("/stats", getAIRequestsStats);

export default router;
