import { createClient } from "redis";
import { config } from "./env.js";
import logger from "../utils/logger.js";

const redisUrl = config.redisUrl;

let client;
let connecting;

export const isRedisEnabled = Boolean(redisUrl);

export const getRedisClient = async () => {
  if (!isRedisEnabled) return null;

  if (client) return client;
  if (connecting) return connecting;

  const instance = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: retries => {
        if (retries > 10) {
          logger.error("Redis: max reconnect attempts reached, giving up");
          return new Error("Redis max retries exceeded");
        }
        const delay = Math.min(retries * 100, 3000);
        logger.warn({ retries, delay }, "Redis: reconnecting...");
        return delay;
      },
    },
  });
  instance.on("error", err => {
    logger.error({ err }, "Redis error");
  });

  connecting = instance.connect().then(() => {
    client = instance;
    return client;
  });

  return connecting;
};
