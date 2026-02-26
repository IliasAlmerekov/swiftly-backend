import express from "express";
import { randomUUID } from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { validateDto } from "../validation/validateDto.js";
import {
  aiChatDto,
  aiConversationParamDto,
  aiMessageDto,
} from "../validation/schemas.js";
import {
  detectLang,
  getTechnicalErrorMessage,
} from "../application/ai/policy/aiPolicy.js";

export const createAIRoutes = ({
  aiService,
  authMiddleware,
  getAIRequestsStats,
  logger,
  isRedisEnabled,
  getRedisClient,
  conversationTtlMs,
}) => {
  const router = express.Router();
  const conversationStore = new Map();
  const resolvedConversationTtlMs = conversationTtlMs || 30 * 60 * 1000;
  const AI_RESPONSE_TIMEOUT_MS = 25_000;
  const REDIS_OPERATION_TIMEOUT_MS = 2_000;
  const conversationKey = (userId, sessionId) =>
    `ai:conversation:${userId}:${sessionId}`;

  const withTimeout = (promise, timeoutMs, timeoutMessage) =>
    Promise.race([
      promise,
      new Promise((_, reject) => {
        const timeoutError = new Error(timeoutMessage);
        timeoutError.code = "TIMEOUT";
        setTimeout(() => reject(timeoutError), timeoutMs);
      }),
    ]);

  router.use(authMiddleware);

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
      try {
        const client = await withTimeout(
          getRedisClient(),
          REDIS_OPERATION_TIMEOUT_MS,
          "Redis client connection timeout"
        );
        const raw = await withTimeout(
          client.get(conversationKey(userId, sessionId)),
          REDIS_OPERATION_TIMEOUT_MS,
          "Redis get conversation timeout"
        );
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        logger.warn(
          { err: error, userId, sessionId },
          "Redis unavailable for getConversation, using in-memory fallback"
        );
      }
    }

    return conversationStore.get(conversationKey(userId, sessionId)) || null;
  };

  const setConversation = async (userId, sessionId, entry) => {
    if (isRedisEnabled) {
      try {
        const client = await withTimeout(
          getRedisClient(),
          REDIS_OPERATION_TIMEOUT_MS,
          "Redis client connection timeout"
        );
        const ttlSeconds = Math.max(
          1,
          Math.floor(resolvedConversationTtlMs / 1000)
        );

        await withTimeout(
          client.set(
            conversationKey(userId, sessionId),
            JSON.stringify(entry),
            {
              EX: ttlSeconds,
            }
          ),
          REDIS_OPERATION_TIMEOUT_MS,
          "Redis set conversation timeout"
        );
        return;
      } catch (error) {
        logger.warn(
          { err: error, userId, sessionId },
          "Redis unavailable for setConversation, using in-memory fallback"
        );
      }
    }

    conversationStore.set(conversationKey(userId, sessionId), entry);
  };

  const deleteConversation = async (userId, sessionId) => {
    if (isRedisEnabled) {
      try {
        const client = await withTimeout(
          getRedisClient(),
          REDIS_OPERATION_TIMEOUT_MS,
          "Redis client connection timeout"
        );
        await withTimeout(
          client.del(conversationKey(userId, sessionId)),
          REDIS_OPERATION_TIMEOUT_MS,
          "Redis delete conversation timeout"
        );
        return;
      } catch (error) {
        logger.warn(
          { err: error, userId, sessionId },
          "Redis unavailable for deleteConversation, using in-memory fallback"
        );
      }
    }

    conversationStore.delete(conversationKey(userId, sessionId));
  };

  const sweepConversations = () => {
    if (isRedisEnabled) return;

    const now = Date.now();
    for (const [key, entry] of conversationStore.entries()) {
      if (!entry || now - entry.updatedAt > resolvedConversationTtlMs) {
        conversationStore.delete(key);
      }
    }
  };

  const sweepInterval = setInterval(
    sweepConversations,
    Math.min(resolvedConversationTtlMs, 5 * 60 * 1000)
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
        {
          sessionId: effectiveSessionId,
          userId,
          messageLength: message.length,
        },
        "AI chat message received"
      );

      let response;
      try {
        response = await withTimeout(
          aiService.generateResponse(message, conversationHistory),
          AI_RESPONSE_TIMEOUT_MS,
          "AI response generation timeout"
        );
      } catch (error) {
        const lang = detectLang(message);
        logger.warn(
          { err: error, sessionId: effectiveSessionId, userId },
          "AI response timeout/failure, returning graceful fallback"
        );
        response = {
          type: "error",
          message: getTechnicalErrorMessage(lang),
          shouldCreateTicket: true,
          relatedSolutions: [],
          metadata: {
            timeout: true,
            fallback: "technical_error_message",
          },
        };
      }

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
      const configured = aiService.isConfigured();

      if (!configured) {
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

  return router;
};
