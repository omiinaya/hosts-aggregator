# Hosts Aggregator - Technical Specification

## Project Overview

A web application for aggregating adblocker hosts files from multiple sources, removing duplicates, and generating a unified hosts file for system-wide ad blocking.

## Architecture Decisions

### 1. Application Architecture: Separate Frontend/Backend
- **Backend**: Node.js + Express + TypeScript API server
- **Frontend**: React + Vite + TypeScript + shadcn/ui
- **Communication**: REST API with JSON payloads
- **Reasoning**: Better separation of concerns, independent scaling, clear API boundaries

### 2. Data Storage: SQLite with Prisma ORM
- **Database**: SQLite for simplicity (can upgrade to PostgreSQL for production)
- **ORM**: Prisma for type-safe database operations
- **File Storage**: Local filesystem for cached hosts files
- **Reasoning**: SQLite is lightweight, file-based, and sufficient for most use cases

### 3. Build System: Vite for Frontend, tsc for Backend
- **Frontend**: Vite with React TypeScript template
- **Backend**: TypeScript compiler with nodemon for development
- **Reasoning**: Vite offers fast development experience, tsc is standard for Node.js

## Backend Architecture

### API Endpoints Design

#### Hosts Sources Management
```
GET    /api/sources           - List all hosts sources
GET    /api/sources/:id       - Get specific source details
POST   /api/sources           - Add new source (URL or file upload)
PUT    /api/sources/:id       - Update source configuration
DELETE /api/sources/:id       - Remove source
PATCH  /api/sources/:id/toggle - Enable/disable source
POST   /api/sources/:id/refresh - Manually refresh source
```

#### Aggregation Operations
```
GET    /api/aggregated        - Get current aggregated hosts list
POST   /api/aggregate         - Trigger aggregation process
GET    /api/aggregated/download - Download unified hosts file
GET    /api/aggregated/stats  - Get aggregation statistics
```

#### System Operations
```
GET    /api/health           - Health check endpoint
GET    /api/metrics          - Application metrics
POST   /api/cleanup          - Clean up cached files
```

### Data Models

#### Source Model
```typescript
interface HostsSource {
  id: string;
  name: string;
  url: string; // URL to fetch from or "file" for uploaded
  type: 'url' | 'file';
  enabled: boolean;
  lastFetched: Date | null;
  lastFetchStatus: 'success' | 'error' | 'pending';
  entryCount: number;
  metadata: {
    format: 'standard' | 'adblock' | 'ublock';
    updateFrequency: 'daily' | 'weekly' | 'manual';
    description?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### Aggregation Result Model
```typescript
interface AggregationResult {
  id: string;
  timestamp: Date;
  totalSources: number;
  totalEntries: number;
  uniqueEntries: number;
  duplicatesRemoved: number;
  filePath: string; // Path to generated unified file
  sourcesUsed: string[]; // IDs of sources included
}
```

### Core Services

#### 1. Hosts Parser Service
- Parse various hosts file formats
- Extract domain entries
- Handle comments and metadata
- Validate entries

#### 2. Aggregation Service
- Fetch from enabled sources
- Merge entries
- Remove duplicates
- Generate unified output

#### 3. File Management Service
- Cache downloaded hosts files
- Manage generated unified files
- Cleanup old files

#### 4. Scheduling Service (Optional)
- Scheduled updates of remote sources
- Periodic aggregation
- Notifications for updates

## Frontend Architecture

### Component Structure

#### Layout Components
- `AppLayout` - Main application layout with header, sidebar, content area
- `Header` - Top navigation bar with app title and user menu
- `Sidebar` - Navigation sidebar with menu items

#### Pages/Routes
- `/` - Dashboard with overview and statistics
- `/sources` - Manage hosts sources
- `/aggregate` - View and trigger aggregation
- `/download` - Download unified hosts file
- `/settings` - Application settings

#### Source Management Components
- `SourcesTable` - Table listing all sources with actions
- `SourceForm` - Form to add/edit a source
- `SourceCard` - Card view for individual source
- `UploadSourceDialog` - Dialog for file upload

#### Aggregation Components
- `AggregationStatus` - Real-time aggregation progress
- `AggregationStats` - Statistics display
- `DownloadButton` - Button to download unified file
- `AggregationHistory` - List of previous aggregations

#### Shared Components (using shadcn/ui)
- `DataTable` - Generic table component with sorting/filtering
- `Card`, `Button`, `Input`, `Dialog`, `Alert`, `Badge`
- `Progress` - Progress indicator
- `Toast` - Notification system

### State Management
- **React Query** for server state (caching, background updates)
- **Zustand** for client state (UI state, forms)
- **React Hook Form** for form handling with validation
- **Zod** for schema validation

### Styling
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** components with custom theme
- **Lucide React** for icons

## Data Flow

### Aggregation Process
```
1. User triggers aggregation or scheduled job runs
2. Backend fetches all enabled sources
   - For URL sources: HTTP GET request
   - For file sources: Read from cache
3. Parse each hosts file
   - Extract domain entries
   - Filter invalid entries
   - Count entries
4. Merge all entries into Set (automatically removes duplicates)
5. Generate unified hosts file
   - Format with headers/comments
   - Write to filesystem
6. Update aggregation record in database
7. Return statistics to frontend
```

### Source Addition Flow
```
1. User submits source form (URL or file upload)
2. Backend validates and stores source
3. If URL: immediately fetch and cache
4. If file: store uploaded file
5. Parse to count entries
6. Return success with entry count
```

## Database Schema

### Tables
```sql
-- Sources table
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT CHECK(type IN ('url', 'file')) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  last_fetched TIMESTAMP,
  last_fetch_status TEXT CHECK(last_fetch_status IN ('success', 'error', 'pending')),
  entry_count INTEGER DEFAULT 0,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Aggregation results table
CREATE TABLE aggregation_results (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_sources INTEGER NOT NULL,
  total_entries INTEGER NOT NULL,
  unique_entries INTEGER NOT NULL,
  duplicates_removed INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  sources_used JSON -- Array of source IDs
);

-- Settings table (for future extensibility)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Build System Configuration

### Backend (Node.js + TypeScript)
```json
// package.json scripts
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "type-check": "tsc --noEmit",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  }
}
```

### Frontend (React + Vite + TypeScript)
```json
// package.json scripts
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  }
}
```

## Dependencies List

### Backend Dependencies
```
dependencies:
  express: ^4.18.0
  cors: ^2.8.5
  helmet: ^7.0.0
  compression: ^1.7.4
  multer: ^1.4.5 (for file uploads)
  node-cron: ^3.0.0 (for scheduling)
  axios: ^1.6.0 (for HTTP requests)
  prisma: ^5.0.0
  @prisma/client: ^5.0.0
  zod: ^3.22.0 (for validation)

devDependencies:
  typescript: ^5.0.0
  ts-node: ^10.9.0
  nodemon: ^3.0.0
  @types/express: ^4.17.0
  @types/node: ^20.0.0
  @types/cors: ^2.8.0
  @types/multer: ^1.4.0
```

### Frontend Dependencies
```
dependencies:
  react: ^18.0.0
  react-dom: ^18.0.0
  react-router-dom: ^6.0.0
  @tanstack/react-query: ^5.0.0
  zustand: ^4.0.0
  react-hook-form: ^7.0.0
  zod: ^3.22.0
  @hookform/resolvers: ^3.0.0
  lucide-react: ^0.0.0
  tailwindcss: ^3.0.0
  class-variance-authority: ^0.7.0
  clsx: ^2.0.0
  tailwind-merge: ^2.0.0

  shadcn/ui components:
    @radix-ui/react-avatar: ^1.0.0
    @radix-ui/react-dialog: ^1.0.0
    @radix-ui/react-dropdown-menu: ^2.0.0
    @radix-ui/react-label: ^2.0.0
    @radix-ui/react-select: ^2.0.0
    @radix-ui/react-separator: ^1.0.0
    @radix-ui/react-slider: ^1.0.0
    @radix-ui/react-switch: ^1.0.0
    @radix-ui/react-tabs: ^1.0.0
    @radix-ui/react-toast: ^1.0.0

devDependencies:
  typescript: ^5.0.0
  vite: ^5.0.0
  @vitejs/plugin-react: ^4.0.0
  @types/react: ^18.0.0
  @types/react-dom: ^18.0.0
  eslint: ^8.0.0
  prettier: ^3.0.0
```

## File Structure Plan

```
hosts-aggregator/
├── backend/
│   ├── src/
│   │   ├── server.ts          # Express server setup
│   │   ├── routes/
│   │   │   ├── sources.ts     # Source management routes
│   │   │   ├── aggregate.ts   # Aggregation routes
│   │   │   └── index.ts       # Route aggregator
│   │   ├── controllers/
│   │   │   ├── sources.controller.ts
│   │   │   └── aggregate.controller.ts
│   │   ├── services/
│   │   │   ├── parser.service.ts      # Hosts file parser
│   │   │   ├── aggregation.service.ts # Core aggregation logic
│   │   │   ├── file.service.ts        # File operations
│   │   │   └── scheduler.service.ts   # Scheduled tasks
│   │   ├── models/
│   │   │   ├── source.model.ts
│   │   │   └── aggregate.model.ts
│   │   ├── middleware/
│   │   │   ├── validation.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── utils/
│   │   │   ├── validation.ts
│   │   │   └── helpers.ts
│   │   └── types/
│   │       └── index.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── data/                  # Cached hosts files
│   ├── generated/             # Generated unified files
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── routes/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Sources.tsx
│   │   │   ├── Aggregate.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   ├── sources/
│   │   │   │   ├── SourcesTable.tsx
│   │   │   │   ├── SourceForm.tsx
│   │   │   │   └── SourceCard.tsx
│   │   │   ├── aggregate/
│   │   │   │   ├── AggregationStatus.tsx
│   │   │   │   └── AggregationStats.tsx
│   │   │   └── ui/            # shadcn/ui components
│   │   │       └── button.tsx
│   │   ├── hooks/
│   │   │   ├── useSources.ts
│   │   │   └── useAggregation.ts
│   │   ├── lib/
│   │   │   ├── api.ts         # API client
│   │   │   ├── queryClient.ts # React Query client
│   │   │   └── utils.ts
│   │   ├── stores/            # Zustand stores
│   │   │   └── ui.store.ts
│   │   └── types/
│   │       └── index.ts
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── .env
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── docs/                      # Documentation
├── plans/                     # Planning documents
├── .gitignore
├── README.md
└── package.json (root - for monorepo if desired)
```

## Deployment Considerations

### Development
- Backend: `npm run dev` on port 3001
- Frontend: `npm run dev` on port 3000
- Proxy frontend requests to backend API

### Production
- Build frontend: `npm run build`
- Serve frontend from backend static files or separate hosting
- Environment variables for database configuration
- Logging and monitoring setup

### Containerization
- Separate containers for backend and frontend
- Volume for data persistence
- Health checks and logging

## Security Considerations

1. **Input Validation**: Validate all URLs and file uploads
2. **Rate Limiting**: Prevent abuse of API endpoints
3. **File Size Limits**: Limit upload sizes for hosts files
4. **SQL Injection**: Use Prisma ORM to prevent SQL injection
5. **CORS**: Configure CORS appropriately for frontend
6. **HTTPS**: Enforce HTTPS in production

## Scalability Considerations

1. **Database**: Start with SQLite, upgrade to PostgreSQL if needed
2. **Caching**: Implement Redis for frequent operations if needed
3. **Queue System**: Use Bull/Redis for background aggregation jobs
4. **Horizontal Scaling**: Stateless backend allows multiple instances

## Monitoring and Logging

1. **Application Logs**: Winston or Pino for structured logging
2. **Error Tracking**: Sentry or similar service
3. **Performance Monitoring**: New Relic or custom metrics
4. **Health Checks**: Endpoint for monitoring system health

## Next Steps for Implementation

1. Set up project structure with monorepo or separate repos
2. Initialize backend with Express and TypeScript
3. Set up Prisma with SQLite database
4. Initialize frontend with Vite + React + TypeScript
5. Configure shadcn/ui components
6. Implement core aggregation logic
7. Build basic UI for source management
8. Implement file download functionality
9. Add scheduling for automatic updates
10. Write tests and documentation