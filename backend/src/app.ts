import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { errorMiddleware } from './middleware/error.middleware';
import { loggingMiddleware } from './middleware/logging.middleware';
import { apiRouter } from './routes';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerDefinition from './config/swagger';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

const app = express();

 // Security middleware with stricter CSP
 app.use(
   helmet({
     contentSecurityPolicy: {
       directives: {
         defaultSrc: ["'self'"],
         scriptSrc: ["'self'", "'unsafe-inline'"],
         styleSrc: ["'self'", "'unsafe-inline'"],
         imgSrc: ["'self'", "data:", "https:"],
         connectSrc: ["'self'"],
         fontSrc: ["'self'"],
         objectSrc: ["'none'"],
         mediaSrc: ["'self'"],
         frameSrc: ["'none'"],
       },
     },
     crossOriginOpenerPolicy: false,
     crossOriginEmbedderPolicy: false,
     hsts: {
       maxAge: 31536000,
       includeSubDomains: true,
       preload: true,
     },
     referrerPolicy: {
       policy: 'strict-origin-when-cross-origin',
     },
   })
 );

 // CORS: reflect request origin for simplicity
 app.use(
   cors({
     origin: true,
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
   })
 );

// Compression
// app.use(compression()); // disabled for debugging

 // Body parsing
 app.use(express.json({ limit: '10mb' }));
 app.use(express.urlencoded({ extended: true }));

   // Serve frontend static files if they exist
   const frontendDist = '/app/frontend/dist';
   if (existsSync(frontendDist)) {
     try {
       const files = readdirSync(frontendDist, { withFileTypes: true });
       console.log(`✓ Frontend dist exists: ${frontendDist} (${files.length} items):`, files.slice(0, 10).map(f => f.name).join(', '));
       const assetsDir = join(frontendDist, 'assets');
       if (existsSync(assetsDir)) {
         const assets = readdirSync(assetsDir);
         console.log(`  assets (${assets.length}):`, assets.slice(0, 10).join(', '));
       }
     } catch (err) {
       console.error(`⚠ Cannot read frontend dist: ${err}`);
     }
     // Explicitly serve /assets folder first
     const assetsDir = join(frontendDist, 'assets');
     if (existsSync(assetsDir)) {
       app.use('/assets', express.static(assetsDir));
       console.log(`✓ Serving assets from ${assetsDir}`);
     }
     app.use(express.static(frontendDist));
     console.log(`✓ Serving static files from ${frontendDist}`);
   } else {
     console.error(`✗ Frontend dist NOT found at ${frontendDist}`);
   }

// Debug logging for all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Logging
app.use(loggingMiddleware);

 // Health check endpoint
 app.get('/health', (req, res) => {
   res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
 });

// Swagger/OpenAPI Documentation
const swaggerOptions: swaggerJsdoc.Options = {
  swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/routes/*.js',
    './src/controllers/*.ts',
    './src/controllers/*.js',
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI options
const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Hosts Aggregator API Documentation',
};

// Serve Swagger UI at /api-docs endpoint
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Serve swagger.json
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

 // API routes
 app.use('/api', apiRouter);

  // SPA fallback: serve index.html for any non-API, non-asset, non-file route
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/api-docs') || req.path === '/health' || req.path.startsWith('/assets')) {
      return next();
    }
    const indexPath = join(frontendDist, 'index.html');
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });

// Error handling middleware
app.use(errorMiddleware);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export { app };