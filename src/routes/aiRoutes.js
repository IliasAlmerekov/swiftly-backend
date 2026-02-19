import express from "express";
import { randomUUID } from "crypto";
import aiService from "../services/aiService.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { getAIRequestsStats } from "../controllers/aiController.js";
import { getRedisClient, isRedisEnabled } from "../config/redis.js";
import { config } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { validateDto } from "../validation/validateDto.js";
import {
  aiChatDto,
  aiConversationParamDto,
  aiMessageDto,
} from "../validation/schemas.js";
import logger from "../utils/logger.js";

const router = express.Router();

router.use(authMiddleware);

const conversationStore = new Map();
const conversationKey = (userId, sessionId) =>
  `ai:conversation:${userId}:${sessionId}`;
const conversationTtlMs = Number(config.aiConversationTtlMs) || 30 * 60 * 1000;

const requireUserId = req => {
  const userId = req.user?._id?.toString();
  if (!userId) {
    throw new AppError("Nicht autorisiert", {
      statusCode: 401,
      code: "AUTH_REQUIRED",
    });
  }
  return userId;
};

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
      {
        EX: ttlSeconds,
      }
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

const sweepInterval = setInterval(
  sweepConversations,
  Math.min(conversationTtlMs, 5 * 60 * 1000)
);
if (typeof sweepInterval.unref === "function") {
  sweepInterval.unref();
}

router.post(
  "/chat",
  asyncHandler(async (req, res) => {
    const { message, sessionId } = validateDto(aiChatDto, req.body || {});
    const userId = requireUserId(req);

    let effectiveSessionId = sessionId || null;
    let stored = effectiveSessionId
      ? await getConversation(userId, effectiveSessionId)
      : null;
    if (!stored) {
      effectiveSessionId = randomUUID();
      stored = null;
    }

    let conversationHistory = stored?.history || [];

    logger.info(
      { sessionId: effectiveSessionId, userId, messageLength: message.length },
      "AI chat message received"
    );

    const response = await aiService.generateResponse(
      message,
      conversationHistory
    );

    conversationHistory.push(
      { role: "user", content: message },
      { role: "assistant", content: response.message }
    );

    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }

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
  })
);

router.post(
  "/analyze-priority",
  asyncHandler(async (req, res) => {
    const { message } = validateDto(aiMessageDto, req.body || {});
    const priority = await aiService.analyzePriority(message);

    res.json({
      success: true,
      data: {
        priority,
        message,
      },
    });
  })
);

router.post(
  "/categorize",
  asyncHandler(async (req, res) => {
    const { message } = validateDto(aiMessageDto, req.body || {});
    const category = await aiService.categorizeIssue(message);

    res.json({
      success: true,
      data: {
        category,
        message,
      },
    });
  })
);

router.delete(
  "/conversation/:sessionId",
  asyncHandler(async (req, res) => {
    const { sessionId } = validateDto(aiConversationParamDto, req.params);
    const userId = requireUserId(req);

    await deleteConversation(userId, sessionId);

    logger.info({ sessionId, userId }, "AI conversation deleted");

    res.json({
      success: true,
      message: "Konversation erfolgreich geloescht",
    });
  })
);

router.get(
  "/status",
  asyncHandler(async (_req, res) => {
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

    return res.json({
      success: true,
      message: "AI-Service ist verfuegbar",
      data: {
        configured: true,
        activeConversations: isRedisEnabled ? null : conversationStore.size,
      },
    });
  })
);

router.post(
  "/test-connection",
  asyncHandler(async (_req, res) => {
    const testResult = await aiService.testConnection();

    if (testResult.success) {
      return res.json({
        success: true,
        message: "OpenAI Verbindung erfolgreich getestet",
        data: testResult,
      });
    }

    return res.status(503).json({
      success: false,
      message: "OpenAI Verbindung fehlgeschlagen",
      data: testResult,
    });
  })
);

router.get("/stats", getAIRequestsStats);

export default router;
