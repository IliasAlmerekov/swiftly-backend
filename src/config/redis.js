import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;

let client;
let connecting;

export const isRedisEnabled = Boolean(redisUrl);

export const getRedisClient = async () => {
  if (!isRedisEnabled) return null;

  if (client) return client;
  if (connecting) return connecting;

  const instance = createClient({ url: redisUrl });
  instance.on("error", (err) => {
    console.error("Redis error:", err);
  });

  connecting = instance.connect().then(() => {
    client = instance;
    return client;
  });

  return connecting;
};
