# Hosts Aggregator - Detailed File Structure Plan

## Root Directory Structure

```
hosts-aggregator/
├── backend/                    # Node.js TypeScript backend
├── frontend/                   # React TypeScript frontend
├── docker/                     # Docker configuration
├── docs/                       # Documentation
├── plans/                      # Planning documents (this folder)
├── scripts/                    # Utility scripts
├── tests/                      # Integration and E2E tests
├── .gitignore
├── README.md
├── LICENSE
└── package.json                # Root package.json for monorepo (optional)
```

## Backend Structure (`/backend`)

```
backend/
├── src/
│   ├── index.ts                          # Application entry point
│   ├── server.ts                         # Express server setup
│   ├── app.ts                            # Express app configuration
│   ├── config/
│   │   ├── index.ts                      # Configuration loader
│   │   ├── database.config.ts            # Database configuration
│   │   ├── server.config.ts              # Server configuration
│   │   └── env.config.ts                 # Environment validation
│   ├── routes/
│   │   ├── index.ts                      # Route aggregator
│   │   ├── sources.routes.ts             # Source management routes
│   │   ├── aggregate.routes.ts           # Aggregation routes
│   │   ├── system.routes.ts              # System routes (health, metrics)
│   │   └── upload.routes.ts              # File upload routes
│   ├── controllers/
│   │   ├── sources.controller.ts         # Source CRUD operations
│   │   ├── aggregate.controller.ts       # Aggregation operations
│   │   ├── upload.controller.ts          # File upload handling
│   │   └── system.controller.ts          # System operations
│   ├── services/
│   │   ├── parser.service.ts             # Hosts file parsing logic
│   │   ├── aggregation.service.ts        # Core aggregation algorithm
│   │   ├── file.service.ts               # File system operations
│   │   ├── scheduler.service.ts          # Scheduled tasks
│   │   ├── source.service.ts             # Source management logic
│   │   └── cache.service.ts              # Caching layer
│   ├── models/
│   │   ├── source.model.ts               # Source data model
│   │   ├── aggregate.model.ts            # Aggregation result model
│   │   └── base.model.ts                 # Base model with common fields
│   ├── middleware/
│   │   ├── validation.middleware.ts      # Request validation
│   │   ├── error.middleware.ts           # Error handling
│   │   ├── logging.middleware.ts         # Request logging
│   │   ├── rate-limit.middleware.ts      # Rate limiting
│   │   └── auth.middleware.ts            # Authentication (future)
│   ├── utils/
│   │   ├── validation.ts                 # Validation utilities
│   │   ├── helpers.ts                    # Helper functions
│   │   ├── logger.ts                     # Logging utility
│   │   ├── file-utils.ts                 # File operations utilities
│   │   └── http-utils.ts                 # HTTP request utilities
│   ├── types/
│   │   ├── index.ts                      # Type exports
│   │   ├── api.types.ts                  # API request/response types
│   │   ├── source.types.ts               # Source-related types
│   │   └── aggregate.types.ts            # Aggregation-related types
│   ├── jobs/
│   │   ├── update-sources.job.ts         # Scheduled source updates
│   │   ├── cleanup.job.ts                # Cleanup old files
│   │   └── index.ts                      # Job scheduler
│   └── scripts/
│       ├── init-db.ts                    # Database initialization
│       └── seed.ts                       # Seed data
├── prisma/
│   ├── schema.prisma                     # Prisma schema definition
│   └── migrations/
│       └── 20240101000000_init/          # Initial migration
│           └── migration.sql
├── data/
│   ├── cache/                            # Cached hosts files
│   │   └── sources/                      # Per-source cached files
│   └── generated/                        # Generated unified files
├── tests/
│   ├── unit/
│   │   ├── parser.service.test.ts
│   │   ├── aggregation.service.test.ts
│   │   └── source.service.test.ts
│   ├── integration/
│   │   ├── sources.routes.test.ts
│   │   ├── aggregate.routes.test.ts
│   │   └── upload.routes.test.ts
│   └── fixtures/
│       ├── sample-hosts.txt              # Sample hosts file for testing
│       └── sample-adblock.txt            # Sample adblock file
├── logs/                                 # Application logs
├── package.json
├── package-lock.json
├── tsconfig.json
├── nodemon.json                          # Nodemon configuration
├── .env.example                          # Example environment variables
├── .env                                  # Local environment variables
└── README.md
```

## Frontend Structure (`/frontend`)

```
frontend/
├── src/
│   ├── main.tsx                          # Application entry point
│   ├── App.tsx                           # Root component
│   ├── index.css                         # Global styles
│   ├── vite-env.d.ts                     # Vite environment types
│   ├── routes/
│   │   ├── index.tsx                     # Route configuration
│   │   ├── Dashboard.tsx                 # Dashboard page
│   │   ├── Sources.tsx                   # Sources management page
│   │   ├── Aggregate.tsx                 # Aggregation page
│   │   ├── Download.tsx                  # Download page
│   │   ├── Settings.tsx                  # Settings page
│   │   └── NotFound.tsx                  # 404 page
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx             # Main layout wrapper
│   │   │   ├── Header.tsx                # Top navigation header
│   │   │   ├── Sidebar.tsx               # Navigation sidebar
│   │   │   ├── Footer.tsx                # Page footer
│   │   │   └── PageContainer.tsx         # Page content container
│   │   ├── sources/
│   │   │   ├── SourcesTable.tsx          # Table listing all sources
│   │   │   ├── SourceForm.tsx            # Add/edit source form
│   │   │   ├── SourceCard.tsx            # Card view for source
│   │   │   ├── UploadSourceDialog.tsx    # File upload dialog
│   │   │   ├── SourceActions.tsx         # Action buttons for source
│   │   │   └── SourceStatusBadge.tsx     # Status badge component
│   │   ├── aggregate/
│   │   │   ├── AggregationStatus.tsx     # Real-time aggregation progress
│   │   │   ├── AggregationStats.tsx      # Statistics display
│   │   │   ├── AggregationHistory.tsx    # History of aggregations
│   │   │   ├── DownloadButton.tsx        # Download unified file button
│   │   │   └── AggregationTrigger.tsx    # Trigger aggregation button
│   │   ├── dashboard/
│   │   │   ├── StatsCards.tsx            # Dashboard statistics cards
│   │   │   ├── RecentAggregations.tsx    # Recent aggregations list
│   │   │   ├── SourceSummary.tsx         # Sources summary
│   │   │   └── QuickActions.tsx          # Quick action buttons
│   │   ├── ui/
│   │   │   ├── button.tsx                # Button component
│   │   │   ├── card.tsx                  # Card component
│   │   │   ├── dialog.tsx                # Dialog component
│   │   │   ├── input.tsx                 # Input component
│   │   │   ├── table.tsx                 # Table component
│   │   │   ├── badge.tsx                 # Badge component
│   │   │   ├── alert.tsx                 # Alert component
│   │   │   ├── progress.tsx              # Progress component
│   │   │   ├── toast.tsx                 # Toast component
│   │   │   ├── select.tsx                # Select component
│   │   │   ├── checkbox.tsx              # Checkbox component
│   │   │   ├── switch.tsx                # Switch component
│   │   │   └── tabs.tsx                  # Tabs component
│   │   └── shared/
│   │       ├── LoadingSpinner.tsx        # Loading spinner
│   │       ├── ErrorBoundary.tsx         # Error boundary
│   │       ├── EmptyState.tsx            # Empty state component
│   │       └── ConfirmDialog.tsx         # Confirmation dialog
│   ├── hooks/
│   │   ├── useSources.ts                 # Sources data hook
│   │   ├── useAggregation.ts             # Aggregation data hook
│   │   ├── useUpload.ts                  # File upload hook
│   │   ├── useToast.ts                   # Toast notification hook
│   │   ├── useDebounce.ts                # Debounce utility hook
│   │   └── useLocalStorage.ts            # Local storage hook
│   ├── lib/
│   │   ├── api.ts                        # API client configuration
│   │   ├── queryClient.ts                # React Query client setup
│   │   ├── utils.ts                      # Utility functions
│   │   ├── formatters.ts                 # Data formatting utilities
│   │   ├── validation.ts                 # Frontend validation
│   │   └── constants.ts                  # Application constants
│   ├── stores/
│   │   ├── ui.store.ts                   # UI state store
│   │   ├── sources.store.ts              # Sources state store
│   │   └── aggregate.store.ts            # Aggregation state store
│   ├── types/
│   │   ├── index.ts                      # Type exports
│   │   ├── api.types.ts                  # API response types
│   │   ├── source.types.ts               # Source types
│   │   ├── aggregate.types.ts            # Aggregation types
│   │   └── ui.types.ts                   # UI component types
│   └── styles/
│       ├── globals.css                    # Global CSS styles
│       ├── themes/                        # Theme definitions
│       │   ├── light.css                  # Light theme
│       │   └── dark.css                   # Dark theme
│       └── components/                    # Component-specific styles
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── robots.txt
├── tests/
│   ├── unit/
│   │   ├── components/
│   │   │   ├── SourcesTable.test.tsx
│   │   │   └── SourceForm.test.tsx
│   │   └── hooks/
│   │       ├── useSources.test.ts
│   │       └── useAggregation.test.ts
│   ├── integration/
│   │   ├── pages/
│   │   │   ├── Sources.test.tsx
│   │   │   └── Aggregate.test.tsx
│   │   └── api/
│   │       └── api.test.ts
│   └── fixtures/
│       └── test-data.ts                  # Test data fixtures
├── package.json
├── package-lock.json
├── vite.config.ts                        # Vite configuration
├── tsconfig.json
├── tsconfig.node.json                    # Node-specific TypeScript config
├── tailwind.config.ts                    # Tailwind CSS configuration
├── postcss.config.js                     # PostCSS configuration
├── .env.example                          # Example environment variables
├── .env                                  # Local environment variables
└── README.md
```

## Docker Structure (`/docker`)

```
docker/
├── Dockerfile.backend                    # Backend Dockerfile
├── Dockerfile.frontend                   # Frontend Dockerfile
├── docker-compose.yml                    # Docker Compose configuration
├── docker-compose.dev.yml                # Development configuration
├── docker-compose.prod.yml               # Production configuration
└── nginx/
    ├── nginx.conf                        # Nginx configuration
    └── ssl/                              # SSL certificates (optional)
```

## Documentation Structure (`/docs`)

```
docs/
├── API.md                                # API documentation
├── ARCHITECTURE.md                       # Architecture overview
├── DEVELOPMENT.md                        # Development guide
├── DEPLOYMENT.md                         # Deployment guide
├── USAGE.md                              # User guide
├── CONTRIBUTING.md                       # Contribution guidelines
├── SECURITY.md                           # Security considerations
└── images/                               Documentation images
```

## Scripts Directory (`/scripts`)

```
scripts/
├── setup.sh                              # Project setup script
├── build.sh                              # Build script
├── deploy.sh                             # Deployment script
├── backup.sh                             # Backup script
├── cleanup.sh                            # Cleanup script
└── health-check.sh                       # Health check script
```

## Key File Descriptions

### Backend Key Files:

1. **`backend/src/services/parser.service.ts`**
   - Core hosts file parsing logic
   - Supports multiple formats (standard hosts, adblock, uBlock)
   - Handles comments, metadata extraction
   - Validates domain entries

2. **`backend/src/services/aggregation.service.ts`**
   - Main aggregation algorithm
   - Duplicate removal using Set data structure
   - Performance optimization for large datasets
   - Unified file generation

3. **`backend/src/routes/sources.routes.ts`**
   - REST API endpoints for source management
   - CRUD operations for hosts sources
   - File upload handling
   - Source validation

4. **`backend/prisma/schema.prisma`**
   - Database schema definition
   - Models for sources, aggregation results
   - Relationships and constraints

### Frontend Key Files:

1. **`frontend/src/components/sources/SourcesTable.tsx`**
   - Main table for displaying sources
   - Sorting, filtering, pagination
   - Action buttons (edit, delete, refresh)

2. **`frontend/src/components/sources/SourceForm.tsx`**
   - Form for adding/editing sources
   - Validation with Zod schema
   - File upload integration
   - URL validation

3. **`frontend/src/components/aggregate/AggregationStatus.tsx`**
   - Real-time aggregation progress display
   - Progress bar with percentage
   - Live updates via WebSocket or polling

4. **`frontend/src/lib/api.ts`**
   - Centralized API client
   - Request/response interceptors
   - Error handling
   - Type-safe API calls

## Build Configuration Files

### Backend (`backend/tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Frontend (`frontend/vite.config.ts`)
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
```

## Environment Variables

### Backend (`.env`)
```
PORT=3001
NODE_ENV=development
DATABASE_URL="file:./dev.db"
CACHE_DIR="./data/cache"
GENERATED_DIR="./data/generated"
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_HOSTS="*"
LOG_LEVEL="info"
```

### Frontend (`.env`)
```
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_NAME="Hosts Aggregator"
VITE_APP_VERSION=1.0.0
```

## Implementation Order Recommendation

1. **Phase 1: Core Backend**
   - Set up Express server with TypeScript
   - Configure Prisma with SQLite
   - Implement parser service for hosts files
   - Create basic aggregation service

2. **Phase 2: Basic API**
   - Implement source management endpoints
   - Create aggregation endpoints
   - Add file upload functionality
   - Set up error handling and validation

3. **Phase 3: Frontend Foundation**
   - Set up Vite + React + TypeScript
   - Configure shadcn/ui components
   - Create basic layout and routing
   - Set up API client and state management

4. **Phase 4: Source Management UI**
   - Implement sources table with CRUD operations
   - Create source form with validation
   - Add file upload dialog
   - Implement source status indicators

5. **Phase 5: Aggregation UI**
   - Build aggregation trigger and status display
   - Create statistics dashboard
   - Implement file download functionality
   - Add aggregation history view

6. **Phase 6: Polish and Features**
   - Add scheduling for automatic updates
   - Implement caching layer
   - Add advanced filtering and search
   - Create comprehensive tests
   - Add documentation and deployment scripts