# Use official Node.js runtime as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S helpdesk -u 1001

# Change ownership of app directory
RUN chown -R helpdesk:nodejs /app
USER helpdesk

# Expose port (Render will assign the PORT env variable)
EXPOSE $PORT

# Health check for Render
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "const http = require('http'); const port = process.env.PORT || 3001; http.get(\`http://localhost:\${port}/api/health\`, (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]