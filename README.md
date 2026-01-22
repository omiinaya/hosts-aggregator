# Hosts Aggregator

A Node.js TypeScript web application for aggregating adblocker hosts files from multiple sources into a unified hosts file.

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
- **Real-time processing**: Live aggregation with progress tracking
- **File upload support**: Upload custom hosts files
- **Scheduled updates**: Automatic updates for URL-based sources
- **Type-safe development**: Full TypeScript support
- **Modern UI**: React frontend with shadcn/ui components

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
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

Access the application at http://localhost:3000

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
- [Development Guide](docs/DEVELOPMENT.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

## License

MIT License - see [LICENSE](LICENSE) file for details.