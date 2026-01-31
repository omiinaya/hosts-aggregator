# Hosts Aggregator - Architecture Overview

## System Architecture

The Hosts Aggregator application follows a modern microservices architecture with separate backend and frontend components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React/Vite)  │◄──►│   (Node.js/     │◄──►│   (SQLite)      │
│                 │    │   Express.js)   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Backend Architecture

### Core Components

1. **Express.js Server** - Main HTTP server handling API requests
2. **Prisma ORM** - Database abstraction layer
3. **Services Layer** - Business logic implementation
4. **Controllers** - Request/response handling
5. **Routes** - API endpoint definitions
6. **Parser Service** - Format detection and conversion logic

### Data Flow

```
Request → Routes → Validation → Controllers → Services → Database
Response ← Routes ← Controllers ← Services ← Database
```

### Format Detection and Conversion Flow

The system supports multiple input and output formats:

```
Source File → Format Detection → Parser → Database → Format Conversion → Output
                (auto/standard/adblock)                    (ABP/Standard)
```

**Format Detection:**
- **Auto**: Automatically detects format from source content
- **Standard**: Traditional hosts format (0.0.0.0 domain)
- **AdBlock**: ABP format (||domain^)

**Output Formats:**
- **ABP (Default)**: AdBlock Plus format with ||domain^ patterns
- **Standard**: Traditional hosts format with 0.0.0.0 domain patterns

**Format Selection:**
- Default output: ABP format
- Standard output: Add `?format=standard` query parameter

### Key Features

- **RESTful API** - Clean, predictable API design
- **Type Safety** - Full TypeScript implementation
- **Error Handling** - Comprehensive error middleware
- **Logging** - Winston-based logging system
- **Validation** - Zod schema validation
- **Rate Limiting** - Request throttling protection
- **Format Support** - ABP and standard hosts format with automatic detection

## Frontend Architecture

### Core Components

1. **React Application** - Component-based UI
2. **React Router** - Client-side routing
3. **React Query** - Server state management
4. **Zustand** - Client state management
5. **shadcn/ui** - Component library
6. **Tailwind CSS** - Utility-first styling

### Data Flow

```
User Action → Components → Hooks → API Calls → Backend
UI Update ← Components ← Hooks ← Response Handling
```

### Key Features

- **Type Safety** - Full TypeScript implementation
- **Responsive Design** - Mobile-first approach
- **State Management** - Optimized server/client state
- **Component Library** - Consistent UI components
- **Error Handling** - User-friendly error messages

## Database Schema

### Sources Table
- `id` - Unique identifier
- `name` - Source display name
- `url` - Source URL (for URL-based sources)
- `filePath` - File path (for file-based sources)
- `type` - Source type (URL/FILE)
- `enabled` - Active status
- `lastFetched` - Last successful fetch timestamp
- `lastChecked` - Last check timestamp
- `lastFetchStatus` - Last fetch result
- `entryCount` - Number of entries in source
- `metadata` - Additional source metadata

### Aggregations Table
- `id` - Unique identifier
- `timestamp` - Aggregation timestamp
- `totalSources` - Number of sources processed
- `totalEntries` - Total entries processed
- `uniqueEntries` - Unique entries after deduplication
- `duplicatesRemoved` - Number of duplicates removed
- `sourcesUsed` - Array of source IDs used
- `blockedDomains` - Array of blocked domains
- `allowedDomains` - Array of allowed domains

## File Structure

### Backend Structure
```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   └── index.ts         # Application entry point
├── prisma/             # Database schema
├── data/               # Generated files
└── tests/              # Test files
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── lib/           # Utility libraries
│   ├── routes/         # Page components
│   ├── stores/         # State management
│   ├── types/          # TypeScript types
│   └── styles/         # Styling files
└── public/            # Static assets
```

## API Endpoints

### Sources Management
- `GET /api/sources` - List all sources
- `GET /api/sources/:id` - Get specific source
- `POST /api/sources` - Create new source
- `PUT /api/sources/:id` - Update source
- `DELETE /api/sources/:id` - Delete source
- `PATCH /api/sources/:id/toggle` - Toggle source status
- `POST /api/sources/:id/refresh` - Refresh source data

### Aggregation
- `POST /api/aggregated` - Trigger aggregation
- `GET /api/aggregated` - Get latest aggregation
- `GET /api/aggregated/stats` - Get aggregation statistics
- `GET /api/aggregated/history` - Get aggregation history

### Serving
- `GET /api/serve/hosts` - Serve hosts file (ABP format by default, supports `?format=standard`)
- `GET /api/serve/hosts/raw` - Serve raw hosts file (ABP format by default, supports `?format=standard`)
- `GET /api/serve/abp` - Serve hosts file in ABP format
- `GET /api/serve/abp/raw` - Serve raw hosts file in ABP format
- `GET /api/serve/hosts/info` - Get hosts file metadata
- `GET /api/serve/health` - Health check endpoint

## Security Considerations

- **Input Validation** - All inputs validated with Zod schemas
- **Rate Limiting** - Prevents abuse of API endpoints
- **File Upload Restrictions** - Limits on file size and types
- **CORS Configuration** - Controlled cross-origin requests
- **Helmet.js** - Security headers protection

## Performance Optimizations

- **Caching** - Source data caching to reduce API calls
- **Deduplication** - Efficient duplicate removal algorithm
- **Dynamic Serving** - All hosts file content served dynamically from database
- **Format Conversion** - On-the-fly format conversion between ABP and standard formats
- **Database Indexing** - Optimized query performance
- **Compression** - Response compression for large files

## Deployment Considerations

- **Environment Variables** - Configurable deployment settings
- **Docker Support** - Containerized deployment
- **Database Migration** - Automated schema updates
- **Log Rotation** - Managed log file growth
- **Health Checks** - Application monitoring