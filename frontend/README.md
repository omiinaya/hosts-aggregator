# Hosts Aggregator - Frontend

React TypeScript frontend application for managing and aggregating adblocker hosts files.

## Features

- Modern React with TypeScript
- Vite build tool for fast development
- Tailwind CSS for styling
- shadcn/ui components
- React Query for state management
- React Router for navigation

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

## Project Structure

```
src/
├── components/     # Reusable UI components
├── routes/         # Page components
├── hooks/          # Custom React hooks
├── lib/            # Utility functions and API client
├── stores/         # State management
├── types/          # TypeScript type definitions
└── styles/         # Global styles and themes
```

## Pages

- `/` - Dashboard with overview
- `/sources` - Source management
- `/aggregate` - Aggregation control
- `/download` - File downloads
- `/settings` - Application settings