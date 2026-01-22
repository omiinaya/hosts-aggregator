# Hosts Aggregator - Development Guide

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd hosts-aggregator
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables:**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   
   # Frontend
   cp frontend/.env.example frontend/.env
   ```

5. **Initialize the database:**
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev
   ```

### Development Workflow

#### Starting Development Servers

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```
   The backend will run on `http://localhost:3001`

2. **Start the frontend development server:**
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on `http://localhost:3000`

#### Development Tools

**Backend Development:**
- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm run type-check` - TypeScript type checking
- `npm run lint` - ESLint code linting
- `npm run test` - Run Jest tests

**Frontend Development:**
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - TypeScript type checking
- `npm run lint` - ESLint code linting
- `npm run test` - Run Vitest tests

## Code Organization

### Backend Structure

```
backend/src/
├── config/           # Configuration files
│   └── database.ts   # Database configuration
├── controllers/      # Request handlers
│   ├── aggregate.controller.ts
│   └── sources.controller.ts
├── middleware/       # Express middleware
│   ├── error.middleware.ts
│   ├── logging.middleware.ts
│   └── validation.middleware.ts
├── models/           # Data models
├── routes/           # API routes
│   ├── aggregate.ts
│   ├── index.ts
│   └── sources.ts
├── services/         # Business logic
│   ├── aggregation.service.ts
│   ├── file.service.ts
│   └── parser.service.ts
├── types/            # TypeScript types
│   └── index.ts
├── utils/            # Utility functions
│   └── logger.ts
└── index.ts          # Application entry point
```

### Frontend Structure

```
frontend/src/
├── components/       # React components
│   ├── aggregate/    # Aggregation components
│   ├── dashboard/     # Dashboard components
│   ├── layout/       # Layout components
│   ├── shared/       # Shared components
│   ├── sources/      # Source management components
│   └── ui/           # UI component library
├── hooks/            # Custom React hooks
│   ├── useAggregation.ts
│   └── useSources.ts
├── lib/              # Utility libraries
│   └── utils.ts
├── routes/           # Page components
│   ├── Aggregate.tsx
│   ├── Dashboard.tsx
│   ├── Download.tsx
│   ├── Settings.tsx
│   ├── Sources.tsx
│   └── index.tsx
├── stores/           # State management
├── styles/           # Styling files
├── types/            # TypeScript types
└── main.tsx          # Application entry point
```

## Adding New Features

### Backend Feature Development

1. **Define Types:** Add TypeScript interfaces in `src/types/`
2. **Create Service:** Implement business logic in `src/services/`
3. **Add Controller:** Handle requests in `src/controllers/`
4. **Create Routes:** Define API endpoints in `src/routes/`
5. **Add Validation:** Create validation schemas in middleware
6. **Write Tests:** Add unit and integration tests

### Frontend Feature Development

1. **Define Types:** Add TypeScript interfaces in `src/types/`
2. **Create Components:** Build React components
3. **Add Hooks:** Create custom hooks for state management
4. **Update Routes:** Add new pages to routing
5. **Write Tests:** Add component and integration tests

## Database Management

### Prisma Schema

The database schema is defined in `backend/prisma/schema.prisma`.

### Creating Migrations

```bash
cd backend
npx prisma migrate dev --name add_new_feature
```

### Resetting Database

```bash
cd backend
npx prisma migrate reset
```

### Generating Prisma Client

```bash
cd backend
npx prisma generate
```

## Testing

### Backend Testing

**Unit Tests:**
```bash
cd backend
npm run test
```

**Integration Tests:**
```bash
cd backend
npm run test:integration
```

**Test Coverage:**
```bash
cd backend
npm run test:coverage
```

### Frontend Testing

**Unit Tests:**
```bash
cd frontend
npm run test
```

**Test Coverage:**
```bash
cd frontend
npm run test:coverage
```

**UI Testing:**
```bash
cd frontend
npm run test:ui
```

## Code Quality

### Linting

**Backend:**
```bash
cd backend
npm run lint          # Check for linting issues
npm run lint:fix      # Auto-fix linting issues
```

**Frontend:**
```bash
cd frontend
npm run lint          # Check for linting issues
npm run lint:fix      # Auto-fix linting issues
```

### Code Formatting

**Backend:**
```bash
cd backend
npm run format        # Format code with Prettier
```

**Frontend:**
```bash
cd frontend
npm run format        # Format code with Prettier
```

### Type Checking

**Backend:**
```bash
cd backend
npm run type-check   # TypeScript type checking
```

**Frontend:**
```bash
cd frontend
npm run type-check   # TypeScript type checking
```

## Environment Configuration

### Backend Environment Variables

Create `backend/.env` file:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL="file:./dev.db"
CACHE_DIR="./data/cache"
GENERATED_DIR="./data/generated"
MAX_FILE_SIZE=10485760
ALLOWED_HOSTS="*"
LOG_LEVEL="info"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Environment Variables

Create `frontend/.env` file:

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_NAME="Hosts Aggregator"
VITE_APP_VERSION=1.0.0
VITE_LOG_LEVEL="info"
```

## Debugging

### Backend Debugging

1. **Enable Debug Logging:** Set `LOG_LEVEL=debug` in environment
2. **Use Winston Logger:** Import and use logger from `src/utils/logger.ts`
3. **Error Handling:** Check error middleware logs
4. **Database Debugging:** Use Prisma Studio

```bash
cd backend
npx prisma studio
```

### Frontend Debugging

1. **Browser DevTools:** Use React DevTools extension
2. **React Query DevTools:** Install React Query DevTools
3. **Console Logging:** Use browser console for debugging
4. **Network Tab:** Monitor API requests

## Performance Optimization

### Backend Optimizations

- **Caching:** Implement Redis caching for frequent queries
- **Database Indexing:** Add indexes for frequently queried fields
- **Stream Processing:** Use streams for large file processing
- **Connection Pooling:** Configure database connection pools

### Frontend Optimizations

- **Code Splitting:** Use React.lazy for route-based splitting
- **Bundle Analysis:** Analyze bundle size with Vite
- **Image Optimization:** Optimize images and assets
- **Caching:** Implement service worker caching

## Security Considerations

### Backend Security

- **Input Validation:** Always validate user input with Zod
- **Rate Limiting:** Implement rate limiting for all endpoints
- **File Upload Security:** Validate file types and sizes
- **CORS Configuration:** Restrict allowed origins
- **Helmet.js:** Use security headers

### Frontend Security

- **XSS Protection:** Sanitize user input
- **CSRF Protection:** Implement CSRF tokens
- **Content Security Policy:** Configure CSP headers
- **Dependency Security:** Regularly update dependencies

## Deployment Preparation

### Backend Deployment

1. **Build the application:**
   ```bash
   cd backend
   npm run build
   ```

2. **Run database migrations:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Start production server:**
   ```bash
   npm start
   ```

### Frontend Deployment

1. **Build the application:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Preview production build:**
   ```bash
   npm run preview
   ```

## Troubleshooting

### Common Issues

**Backend won't start:**
- Check if port 3001 is available
- Verify database connection
- Check environment variables

**Frontend won't connect to backend:**
- Verify backend is running
- Check CORS configuration
- Verify API base URL

**Database issues:**
- Run database migrations
- Check database file permissions
- Verify Prisma client generation

**Build failures:**
- Clear node_modules and reinstall
- Check TypeScript errors
- Verify dependency versions

### Getting Help

1. Check the project's GitHub issues
2. Review the documentation
3. Check console logs for error messages
4. Use debugging tools described above