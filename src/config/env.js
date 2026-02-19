import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    MONGO_URI: z.string().optional(),
    JWT_SECRET: z.string().min(1).optional(),
    JWT_EXPIRES: z.string().min(1).default("12h"),
    JWT_REFRESH_SECRET: z.string().min(1).optional(),
    JWT_REFRESH_EXPIRES: z.string().min(1).default("7d"),
    CORS_ORIGIN: z.string().optional(),
    LOG_LEVEL: z.string().optional(),
    REQUEST_BODY_LIMIT: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    REDIS_URL: z.string().optional(),
    AI_CONVERSATION_TTL_MS: z.coerce.number().int().positive().optional(),
    CLOUDINARY_URL: z.string().optional(),
    CLOUD_NAME: z.string().optional(),
    CLOUD_API_KEY: z.string().optional(),
    CLOUD_API_SECRET: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.NODE_ENV !== "test" && !values.MONGO_URI) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "MONGO_URI is required outside of test",
        path: ["MONGO_URI"],
      });
    }

    const hasCloudinaryUrl = Boolean(values.CLOUDINARY_URL);
    const hasCloudinaryParts = Boolean(
      values.CLOUD_NAME && values.CLOUD_API_KEY && values.CLOUD_API_SECRET
    );

    if (
      values.NODE_ENV !== "test" &&
      !hasCloudinaryUrl &&
      !hasCloudinaryParts
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Cloudinary config is required outside of test (CLOUDINARY_URL or CLOUD_NAME/CLOUD_API_KEY/CLOUD_API_SECRET).",
        path: ["CLOUDINARY_URL"],
      });
    }

    if (values.NODE_ENV !== "test" && !values.JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "JWT_SECRET is required outside of test",
        path: ["JWT_SECRET"],
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.format());
  throw new Error("Invalid environment configuration");
}

const env = parsed.data;

const resolvedJwtSecret =
  env.JWT_SECRET || (env.NODE_ENV === "test" ? "test-secret" : undefined);

const resolvedRefreshSecret =
  env.JWT_REFRESH_SECRET ||
  env.JWT_SECRET ||
  (env.NODE_ENV === "test" ? "test-refresh-secret" : undefined);

export const config = {
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
  port: env.PORT,
  mongoUri: env.MONGO_URI,
  jwtSecret: resolvedJwtSecret,
  jwtExpires: env.JWT_EXPIRES,
  jwtRefreshSecret: resolvedRefreshSecret,
  jwtRefreshExpires: env.JWT_REFRESH_EXPIRES,
  corsOrigin: env.CORS_ORIGIN || "",
  logLevel: env.LOG_LEVEL || (env.NODE_ENV === "test" ? "silent" : "info"),
  requestBodyLimit: env.REQUEST_BODY_LIMIT || "1mb",
  openaiApiKey: env.OPENAI_API_KEY,
  redisUrl: env.REDIS_URL,
  aiConversationTtlMs: env.AI_CONVERSATION_TTL_MS,
  cloudinaryUrl: env.CLOUDINARY_URL,
  cloudinaryName: env.CLOUD_NAME,
  cloudinaryApiKey: env.CLOUD_API_KEY,
  cloudinaryApiSecret: env.CLOUD_API_SECRET,
};

