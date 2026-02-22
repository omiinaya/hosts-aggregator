# Combined Dockerfile for Coolify deployment
# This serves both frontend (via nginx) and backend (via node) in a single container

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ .

# Build frontend (will output to dist/)
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy backend source
COPY backend/ .

# Generate Prisma client and build
RUN npx prisma generate && npm run build

# Stage 3: Production
FROM node:20-alpine AS production

# Install nginx
RUN apk add --no-cache nginx

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built backend files
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/prisma ./backend/prisma

# Copy frontend build to nginx html directory
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Starting Hosts Aggregator..."' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start nginx in background' >> /app/start.sh && \
    echo 'nginx' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start backend server' >> /app/start.sh && \
    echo 'cd /app/backend && node dist/index.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Change ownership
RUN chown -R nodejs:nodejs /app && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Expose ports
EXPOSE 80 3010

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ && \
        node -e "require('http').get('http://localhost:3010/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start both services
CMD ["/app/start.sh"]
