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

  const instance = createClient({ url: redisUrl });
  instance.on("error", err => {
    logger.error({ err }, "Redis error");
  });

  connecting = instance.connect().then(() => {
    client = instance;
    return client;
  });

  return connecting;
};
