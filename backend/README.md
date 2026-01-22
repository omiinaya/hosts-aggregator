# Hosts Aggregator - Backend

Node.js TypeScript backend service for aggregating adblocker hosts files.

## Features

- RESTful API for source management
- File upload and processing
- Scheduled aggregation tasks
- SQLite database with Prisma ORM
- Type-safe development

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

3. Initialize database:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

## API Endpoints

- `GET /health` - Health check
- `GET /api/sources` - List sources
- `POST /api/sources` - Create source
- `GET /api/sources/:id` - Get source
- `PUT /api/sources/:id` - Update source
- `DELETE /api/sources/:id` - Delete source
- `POST /api/aggregate` - Trigger aggregation
- `GET /api/download/:id` - Download aggregated file