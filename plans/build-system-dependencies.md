# Hosts Aggregator - Build System and Dependencies Specification

## Build System Architecture

### Monorepo vs Separate Repositories

**Decision: Separate repositories for backend and frontend**
- **Backend**: Standalone Node.js TypeScript application
- **Frontend**: Standalone React TypeScript application
- **Reasoning**: Clear separation of concerns, independent deployment, easier maintenance

### Backend Build System

#### Development Environment
```json
// backend/package.json scripts
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "type-check": "tsc --noEmit",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:reset": "prisma migrate reset",
    "prisma:seed": "ts-node prisma/seed.ts"
  }
}
```

#### Production Build Configuration
```json
// backend/tsconfig.json
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
    "sourceMap": true,
    "removeComments": true,
    "noEmitOnError": true,
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests", "**/*.test.ts"]
}
```

#### Development Tools Configuration
```json
// backend/nodemon.json
{
  "watch": ["src"],
  "ext": "ts",
  "exec": "ts-node src/index.ts",
  "ignore": ["src/**/*.test.ts", "dist"]
}
```

### Frontend Build System

#### Development Environment
```json
// frontend/package.json scripts
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write src/**/*.{ts,tsx}",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

#### Vite Configuration
```typescript
// frontend/vite.config.ts
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
      '@types': path.resolve(__dirname, './src/types'),
      '@styles': path.resolve(__dirname, './src/styles')
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
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  }
})
```

#### TypeScript Configuration
```json
// frontend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@lib/*": ["./src/lib/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@types/*": ["./src/types/*"],
      "@styles/*": ["./src/styles/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## Dependencies Specification

### Backend Dependencies

#### Core Dependencies
```json
// backend/package.json dependencies
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "multer": "^1.4.5-lts.1",
    "node-cron": "^3.0.3",
    "axios": "^1.6.2",
    "prisma": "^5.7.1",
    "@prisma/client": "^5.7.1",
    "zod": "^3.22.4",
    "winston": "^3.11.0",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "dotenv": "^16.3.1"
  }
}
```

#### Development Dependencies
```json
// backend/package.json devDependencies
{
  "devDependencies": {
    "typescript": "^5.3.3",
    "ts-node": "^10.9.1",
    "nodemon": "^3.0.2",
    "@types/node": "^20.10.5",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/multer": "^1.4.11",
    "@types/compression": "^1.7.5",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8",
    "ts-jest": "^29.1.1",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.13.1",
    "@typescript-eslint/parser": "^6.13.1",
    "prettier": "^3.1.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.1"
  }
}
```

### Frontend Dependencies

#### Core Dependencies
```json
// frontend/package.json dependencies
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.19.0",
    "@tanstack/react-query": "^5.8.3",
    "zustand": "^4.4.6",
    "react-hook-form": "^7.47.0",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.1",
    "lucide-react": "^0.292.0",
    "tailwindcss": "^3.3.6",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "sonner": "^1.0.5",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slider": "^1.1.1",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5"
  }
}
```

#### Development Dependencies
```json
// frontend/package.json devDependencies
{
  "devDependencies": {
    "typescript": "^5.3.3",
    "vite": "^5.0.8",
    "@vitejs/plugin-react": "^4.2.1",
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "eslint": "^8.55.0",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "@typescript-eslint/eslint-plugin": "^6.13.1",
    "@typescript-eslint/parser": "^6.13.1",
    "prettier": "^3.1.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.1",
    "vitest": "^1.0.4",
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^6.1.4",
    "@testing-library/user-event": "^14.5.1",
    "jsdom": "^23.0.1",
    "@vitest/coverage-v8": "^1.0.4"
  }
}
```

## Dependency Justification

### Backend Dependencies

1. **Express**: Minimalist web framework for Node.js
2. **CORS**: Cross-Origin Resource Sharing middleware
3. **Helmet**: Security headers middleware
4. **Compression**: Response compression middleware
5. **Multer**: File upload handling
6. **Node-cron**: Scheduled task execution
7. **Axios**: HTTP client for fetching remote hosts files
8. **Prisma**: Type-safe ORM with SQLite support
9. **Zod**: Runtime type validation
10. **Winston**: Structured logging

### Frontend Dependencies

1. **React + React DOM**: Core UI library
2. **React Router DOM**: Client-side routing
3. **TanStack Query**: Server state management
4. **Zustand**: Client state management
5. **React Hook Form**: Form handling with validation
6. **Zod**: Schema validation
7. **Lucide React**: Icon library
8. **Tailwind CSS**: Utility-first CSS framework
9. **Radix UI**: Unstyled, accessible UI primitives
10. **Sonner**: Toast notifications

## Build Pipeline Configuration

### ESLint Configuration
```json
// backend/.eslintrc.json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn"
  },
  "env": {
    "node": true,
    "es6": true
  }
}
```

### Prettier Configuration
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### Jest Configuration
```javascript
// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
```

### Vitest Configuration
```javascript
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/test/']
    }
  }
});
```

## Environment Configuration

### Backend Environment Variables
```bash
# backend/.env
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
```bash
# frontend/.env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_NAME="Hosts Aggregator"
VITE_APP_VERSION=1.0.0
VITE_LOG_LEVEL="info"
```

## Docker Configuration

### Backend Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY dist ./dist
COPY data ./data

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

### Frontend Dockerfile
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## CI/CD Pipeline (GitHub Actions)

### Backend Workflow
```yaml
# .github/workflows/backend.yml
name: Backend CI/CD

on:
  push:
    paths:
      - 'backend/**'
  pull_request:
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json
    
    - name: Install dependencies
      run: cd backend && npm ci
    
    - name: Type check
      run: cd backend && npm run type-check
    
    - name: Lint
      run: cd backend && npm run lint
    
    - name: Test
      run: cd backend && npm test
    
    - name: Build
      run: cd backend && npm run build
```

### Frontend Workflow
```yaml
# .github/workflows/frontend.yml
name: Frontend CI/CD

on:
  push:
    paths:
      - 'frontend/**'
  pull_request:
    paths:
      - 'frontend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: cd frontend && npm ci
    
    - name: Type check
      run: cd frontend && npm run type-check
    
    - name: Lint
      run: cd frontend && npm run lint
    
    - name: Test
      run: cd frontend && npm test
    
    - name: Build
      run: cd frontend && npm run build
```

## Performance Considerations

### Backend Optimization
- Use streams for large file processing
- Implement caching for frequently accessed data
- Use connection pooling for database operations
- Implement rate limiting to prevent abuse

### Frontend Optimization
- Code splitting with dynamic imports
- Lazy loading of components
- Image optimization
- Bundle analysis and optimization

### Build Optimization
- Tree shaking for unused code removal
- Minification and compression
- Source maps for debugging
- Cache busting for static assets