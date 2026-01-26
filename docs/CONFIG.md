# Configuration

## Required (non-test)
- MONGO_URI
- JWT_SECRET
- CLOUDINARY_URL or CLOUD_NAME/CLOUD_API_KEY/CLOUD_API_SECRET

## Recommended
- JWT_EXPIRES (default: 12h)
- PORT (default: 3001)
- NODE_ENV (development|test|production)
- CORS_ORIGIN (comma-separated origins)
- LOG_LEVEL (default: info, test uses silent)
- REQUEST_BODY_LIMIT (default: 1mb)

## Optional
- OPENAI_API_KEY
- REDIS_URL
- AI_CONVERSATION_TTL_MS

