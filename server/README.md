# Revelia Backend API

## Overview
Backend API for Revelia - AI-powered face and palm reading mobile app.

## Tech Stack
- Node.js 20 LTS
- Express.js
- TypeScript
- MongoDB + Mongoose
- Claude Sonnet 4.5 API
- JWT Authentication

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- Anthropic API key (for Claude)

### Installation
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your values
```

### Development
```bash
# Run in development mode (hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint
```

### Environment Variables
See `.env.example` for required variables.

## API Endpoints

### Health Check
```
GET /api/health
```
Returns API status and database connection info.

## Project Structure
```
src/
├── index.ts              # Entry point
├── app.ts                # Express app configuration
├── config/               # Configuration files
├── routes/               # API routes
├── controllers/          # Route controllers
├── services/             # Business logic
├── models/               # Mongoose models
├── middleware/           # Express middleware
├── prompts/              # Claude API prompts
└── utils/                # Utility functions
```

## Development Guidelines
1. Always validate inputs with Zod
2. Use async/await for async operations
3. Return consistent JSON: `{ success: boolean, data?: T, error?: string }`
4. Never log sensitive data (API keys, passwords, user images)
5. Keep Claude API costs under $0.03 per reading

## License
MIT
