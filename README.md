# Swiftly Helpdesk - Backend API

RESTful API for the Swiftly Helpdesk System built with Node.js and Express.

##  Technology Stack

- **Node.js** - Runtime Environment
- **Express.js** - Web Framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password Hashing
- **ESLint** - Code Linting
- **Prettier** - Code Formatting
- **Jest** - Testing Framework

##  Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Make sure MongoDB is running
# Then start the development server
npm run dev
```

##  Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier

##  Project Structure

```
src/
 controllers/        # Route controllers
 middlewares/        # Express middlewares
 models/            # Database models (Mongoose)
 routes/            # Route definitions
 utils/             # Utility functions
 server.js          # Application entry point
```

##  Configuration

### Environment Variables

Create `.env` file with:

```
MONGO_URI=mongodb://localhost:27017/helpdesk
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES=7d
PORT=3001
NODE_ENV=development
```

### Database Setup

1. Install MongoDB locally or use MongoDB Atlas
2. Update `MONGO_URI` in your `.env` file
3. The application will automatically create collections on first run

##  API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Tickets
- `GET /api/tickets` - Get tickets with filters (protected) with cursor pagination
- `GET /api/tickets/:id` - Get single ticket (protected)
- `POST /api/tickets` - Create new ticket (protected)
- `PUT /api/tickets/:id` - Update ticket (protected)
- `DELETE /api/tickets/:id` - Delete ticket (admin only)

#### Ticket pagination
Use `limit` and `cursor` query params. The response includes `items` and `pageInfo`.

Example:

```bash
GET /api/tickets?limit=20
GET /api/tickets?limit=20&cursor=<nextCursor>
```

```json
{
  "items": [/* tickets */],
  "pageInfo": {
    "limit": 20,
    "hasNextPage": true,
    "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LTAxLTI3VDEwOjAwOjAwLjAwMFoiLCJpZCI6IjY1Y..."
  }
}
```

##  Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

##  Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

##  Deployment

### Production Build

```bash
# Install production dependencies only
npm ci --only=production

# Start production server
npm start
```

### Environment Setup

Set these environment variables in production:

- `MONGO_URI` - Production MongoDB connection string
- `JWT_SECRET` - Strong secret key for JWT tokens  
- `JWT_EXPIRES` - Token expiration time (e.g., 7d, 24h, 1h)
- `NODE_ENV=production`
- `PORT` - Server port (default: 3001)

##  API Documentation

Detailed API documentation is available at `/api/docs` when running the development server.

##  Related

- [Frontend Application](../helpdesk-frontend/README.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

##  Contributing

1. Follow the established code style (ESLint + Prettier)
2. Write tests for new features
3. Use conventional commit messages
4. Ensure all tests pass before committing



## Security Guardrails

This repository blocks commits and pushes when potential secrets are detected.

- Local hooks (Husky):
  - `pre-commit` -> `npm run secrets:scan`
  - `pre-push` -> `npm run secrets:scan`
- CI gate (GitLab):
  - `secret_scan` stage using `gitleaks`

Install `gitleaks` locally to use hooks:

```bash
# verify installation
gitleaks version
```

If you intentionally use non-secret placeholders, keep them in documented allowlisted files (`.env.example`, `README.md`, `docs/*`) and update `.gitleaks.toml` when needed.
