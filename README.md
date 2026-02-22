# Hosts Aggregator

A Node.js TypeScript web application for aggregating adblocker hosts files from multiple sources into a unified hosts file. The served file defaults to **ABP (AdBlock Plus) format** for compatibility with uBlock Origin, AdGuard, and other modern adblockers. Standard hosts format is also available for Pi-hole and AdGuard Home.

## Project Structure

```
hosts-aggregator/
├── backend/                    # Node.js TypeScript backend
├── frontend/                   # React TypeScript frontend
├── docker/                     # Docker configuration
├── docs/                       # Documentation
├── plans/                      # Planning documents
├── scripts/                    # Utility scripts
├── tests/                      # Integration and E2E tests
├── .gitignore
├── README.md
└── LICENSE
```

## Features

- **Multi-source aggregation**: Combine hosts files from multiple sources
- **ABP format support**: Default output in AdBlock Plus format (||domain^) for uBlock Origin, AdGuard, and other adblockers
- **Standard format support**: Optional standard hosts format (0.0.0.0 domain) for Pi-hole and AdGuard Home
- **Format detection**: Automatic detection of source format (standard, adblock, or auto)
- **Real-time processing**: Live aggregation with progress tracking
- **File upload support**: Upload custom hosts files
- **Scheduled updates**: Automatic updates for URL-based sources
- **Type-safe development**: Full TypeScript support
- **Modern UI**: React frontend with shadcn/ui components

## 📚 Tests

Unit tests for config, filter, and auto‑aggregation services added to improve coverage.

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
2. Install root-level dependencies:
   ```bash
   npm install
   ```

3. Install backend and frontend dependencies:
   ```bash
   npm run install:all
   ```

4. Set up environment variables:
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   
   # Frontend
   cp frontend/.env.example frontend/.env
   ```

5. Initialize the database:
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev
   ```

### Development

Start both servers concurrently from the root directory:
```bash
npm run dev
```

Or start them individually:

Start the backend server:
```bash
cd backend
npm run dev
```

Start the frontend development server:
```bash
cd frontend
npm run dev
```

Access the application at http://localhost:3011

Backend API is available at http://localhost:3010/api

## Output Formats

The hosts aggregator supports two output formats:

### ABP Format (Default)
- **Format**: AdBlock Plus style with `||domain^` patterns
- **Use case**: uBlock Origin, AdGuard, and other modern adblockers
- **Example output**:
  ```
  ||example.com^
  ||ads.example.com^
  @@||trusted-site.com^
  ```
- **Endpoint**: `GET /api/serve/hosts` (default) or `GET /api/serve/abp`

### Standard Format
- **Format**: Traditional hosts file format with `0.0.0.0 domain` patterns
- **Use case**: Pi-hole, AdGuard Home, and other DNS-based blockers
- **Example output**:
  ```
  0.0.0.0 example.com
  0.0.0.0 ads.example.com
  ```
- **Endpoint**: `GET /api/serve/hosts?format=standard`

### Format Selection
- Default: ABP format (no query parameter needed)
- Standard: Add `?format=standard` to any serve endpoint
- Raw endpoints available without headers for both formats

See [docs/SERVING.md](docs/SERVING.md) for detailed serving configuration.

## Technology Stack

### Backend
- **Node.js** + **TypeScript**
- **Express.js** web framework
- **Prisma** ORM with SQLite
- **Winston** logging
- **Zod** validation

### Frontend
- **React** + **TypeScript**
- **Vite** build tool
- **Tailwind CSS** styling
- **shadcn/ui** components
- **React Query** state management

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [API Swagger UI](docs/API.md#swagger-documentation) - Interactive API docs at `/api-docs`
- [Nginx Proxy Manager Guide](docs/NGINX_PROXY_MANAGER.md) - Reverse proxy setup with custom locations
- [Serving Guide](docs/SERVING.md) - Format options and configuration
- [Development Guide](docs/DEVELOPMENT.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [User Guide](docs/USER_GUIDE.md) - Comprehensive user documentation
- [Launch Checklist](docs/LAUNCH_CHECKLIST.md) - Production deployment checklist
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

## License

MIT License - see [LICENSE](LICENSE) file for details.