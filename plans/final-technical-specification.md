# Hosts Aggregator - Comprehensive Technical Specification

## Executive Summary

This document outlines the complete technical specification for a Node.js TypeScript web application that aggregates adblocker hosts files. The application provides a user-friendly interface for managing hosts file sources, aggregating content, removing duplicates, and generating unified hosts files for system-wide ad blocking.

## Project Overview

### Core Functionality
- **Aggregate multiple hosts files** from various sources
- **Remove duplicates** efficiently using Set data structures
- **Generate unified hosts file** in standard format
- **Manage sources** with CRUD operations and status tracking

### Key Features
- **Source Management**: Add, edit, enable/disable hosts file sources
- **Real-time Aggregation**: Progress tracking and status updates
- **File Download**: Download generated unified hosts files
- **Statistics Dashboard**: Performance metrics and aggregation history
- **Scheduled Updates**: Automatic source refreshing

## Technical Architecture

### System Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend API   │    │   Data Layer   │
│   React App     │◄──►│   Node.js/Express│◄──►│   SQLite DB    │
│   (Port 3000)   │    │   (Port 3001)    │    │   File Cache    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Technology Stack

#### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with TypeScript
- **Database**: SQLite with Prisma ORM
- **Validation**: Zod for runtime type safety
- **File Processing**: Stream-based parsing
- **Scheduling**: Node-cron for automated tasks

#### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite for fast development
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Query + Zustand
- **Routing**: React Router DOM
- **Icons**: Lucide React

## Detailed Specifications

### 1. Backend Architecture

#### API Endpoints
- **Sources Management**: `GET/POST/PUT/DELETE /api/sources`
- **Aggregation**: `POST /api/aggregate`, `GET /api/aggregated`
- **File Operations**: `GET /api/aggregated/download`
- **System**: `GET /api/health`, `GET /api/metrics`

#### Core Services
- **Parser Service**: Handles multiple hosts file formats
- **Aggregation Service**: Core duplicate removal logic
- **File Service**: File system operations and caching
- **Scheduler Service**: Automated source updates

### 2. Frontend Architecture

#### Component Structure
- **Layout Components**: AppLayout, Header, Sidebar
- **Page Components**: Dashboard, Sources, Aggregate, Download
- **Feature Components**: SourcesTable, SourceForm, AggregationStatus
- **UI Components**: shadcn/ui based reusable components

#### State Management
- **Server State**: React Query for API data
- **Client State**: Zustand for UI state
- **Form State**: React Hook Form with Zod validation

### 3. Data Models

#### Database Schema
```sql
-- Sources table
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT CHECK(type IN ('url', 'file')) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  last_fetched TIMESTAMP,
  last_fetch_status TEXT,
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
  sources_used JSON
);
```

### 4. File Structure

#### Backend Structure
```
backend/
├── src/
│   ├── routes/           # API route handlers
│   ├── controllers/      # Business logic
│   ├── services/         # Core services
│   ├── models/           # Data models
│   ├── middleware/       # Express middleware
│   └── utils/            # Utility functions
├── prisma/               # Database schema
├── data/                 # File cache and generated files
└── tests/                # Test files
```

#### Frontend Structure
```
frontend/
├── src/
│   ├── routes/           # Page components
│   ├── components/       # React components
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilities and API client
│   ├── stores/           # State management
│   └── types/            # TypeScript definitions
└── public/               # Static assets
```

### 5. Build System

#### Backend Build
- **Development**: `npm run dev` (nodemon + ts-node)
- **Production**: `npm run build` (TypeScript compiler)
- **Testing**: Jest with TypeScript support
- **Linting**: ESLint + Prettier

#### Frontend Build
- **Development**: `npm run dev` (Vite dev server)
- **Production**: `npm run build` (Vite build)
- **Testing**: Vitest + Testing Library
- **Linting**: ESLint + Prettier

### 6. Dependencies

#### Backend Dependencies
- **Core**: express, cors, helmet, compression
- **Database**: prisma, @prisma/client
- **File Processing**: multer, axios
- **Validation**: zod, express-validator
- **Scheduling**: node-cron
- **Logging**: winston

#### Frontend Dependencies
- **Core**: react, react-dom, react-router-dom
- **UI**: @radix-ui components, lucide-react
- **State**: @tanstack/react-query, zustand
- **Forms**: react-hook-form, zod, @hookform/resolvers
- **Styling**: tailwindcss, class-variance-authority

## Performance Considerations

### Memory Optimization
- **Stream Processing**: Line-by-line file parsing for large hosts files
- **Set Data Structure**: Efficient duplicate removal
- **Caching**: Source content and aggregation results caching
- **Connection Pooling**: Database connection management

### Scalability
- **Stateless Design**: Backend can be horizontally scaled
- **Database Choice**: SQLite for simplicity, PostgreSQL for production
- **Caching Layer**: Redis integration for high-traffic scenarios
- **Queue System**: Bull/Redis for background job processing

## Security Implementation

### Input Validation
- **URL Validation**: Whitelist HTTP/HTTPS protocols only
- **File Upload**: Size limits and MIME type validation
- **SQL Injection**: Prisma ORM prevents injection attacks
- **XSS Protection**: Helmet.js security headers

### Rate Limiting
- **API Endpoints**: Express rate limiting middleware
- **File Uploads**: Size and frequency limits
- **Aggregation**: Concurrent request limits

## Error Handling

### Graceful Degradation
- **Source Failures**: Continue aggregation with available sources
- **Network Issues**: Retry logic with exponential backoff
- **File System**: Proper error handling for file operations
- **Database**: Connection failure handling

### Monitoring
- **Application Logs**: Structured logging with Winston
- **Performance Metrics**: Aggregation timing and memory usage
- **Error Tracking**: Comprehensive error reporting
- **Health Checks**: System status monitoring

## Deployment Strategy

### Development Environment
- **Backend**: Local Node.js server on port 3001
- **Frontend**: Vite dev server on port 3000
- **Database**: SQLite file-based database
- **Proxy**: Vite proxy for API calls

### Production Deployment
- **Containerization**: Docker for both backend and frontend
- **Orchestration**: Docker Compose for multi-container setup
- **Reverse Proxy**: Nginx for static file serving
- **Environment Variables**: Secure configuration management

### CI/CD Pipeline
- **GitHub Actions**: Automated testing and deployment
- **Testing**: Unit, integration, and end-to-end tests
- **Build Verification**: Type checking and linting
- **Deployment**: Automated deployment to production

## Testing Strategy

### Backend Testing
- **Unit Tests**: Individual service and utility functions
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full aggregation workflow testing
- **Mocking**: HTTP requests and file system operations

### Frontend Testing
- **Unit Tests**: Component and hook testing
- **Integration Tests**: User interaction testing
- **E2E Tests**: Browser automation with Playwright
- **Visual Testing**: Component snapshot testing

## Documentation

### Technical Documentation
- **API Documentation**: OpenAPI/Swagger specification
- **Architecture**: System design and data flow diagrams
- **Deployment**: Setup and configuration guides
- **Development**: Contribution guidelines

### User Documentation
- **Getting Started**: Quick start guide
- **User Manual**: Feature documentation
- **Troubleshooting**: Common issues and solutions
- **FAQ**: Frequently asked questions

## Future Enhancements

### Phase 2 Features
- **User Authentication**: Multi-user support with roles
- **Advanced Filtering**: Domain pattern matching and exclusions
- **Import/Export**: Bulk operations and backup/restore
- **Notifications**: Email/SMS alerts for updates

### Phase 3 Features
- **Plugin System**: Custom parsers and processors
- **API Extensions**: Webhook integrations
- **Analytics**: Usage statistics and performance insights
- **Mobile App**: React Native companion app

## Success Metrics

### Performance Metrics
- **Aggregation Time**: Target < 30 seconds for 50+ sources
- **Memory Usage**: < 500MB for large aggregations
- **Response Time**: API responses < 200ms
- **Uptime**: 99.9% availability target

### User Experience Metrics
- **Page Load Time**: < 3 seconds for dashboard
- **Aggregation Success Rate**: > 95% source processing success
- **User Satisfaction**: Positive feedback and adoption
- **Error Rate**: < 1% failed API requests

## Risk Assessment

### Technical Risks
- **Large File Handling**: Memory usage with very large hosts files
- **Source Reliability**: Dependency on external hosts file providers
- **Security**: Potential vulnerabilities in file processing
- **Performance**: Scalability with increasing number of sources

### Mitigation Strategies
- **Stream Processing**: Handle files of any size efficiently
- **Caching**: Reduce dependency on external sources
- **Security Audits**: Regular vulnerability assessments
- **Monitoring**: Proactive performance monitoring

## Conclusion

This technical specification provides a comprehensive blueprint for building a robust hosts file aggregation system. The architecture balances performance, scalability, and maintainability while providing a modern user experience. The modular design allows for future enhancements and the technology stack ensures long-term viability.

The project is well-positioned to become a valuable tool for users seeking to create unified ad-blocking hosts files from multiple trusted sources, with the flexibility to customize and manage their blocking preferences effectively.