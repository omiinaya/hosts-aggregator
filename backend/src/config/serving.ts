import dotenv from 'dotenv';

dotenv.config();

export interface ServingConfig {
  // Serving endpoint configuration
  serveEnabled: boolean;
  servePort: number;
  serveHost: string;
  
  // Auto-aggregation configuration
  autoAggregateEnabled: boolean;
  autoAggregateOnSourceChange: boolean;
  autoAggregateDelayMs: number;
  
  // Cache control headers
  cacheControlEnabled: boolean;
  cacheMaxAgeSeconds: number;
  
  // Security configuration
  requireAuthForServe: boolean;
  serveAuthToken?: string;
  
  // Pi-hole/AdGuard Home specific
  serveRawByDefault: boolean;
  includeHeaders: boolean;
}

const config: ServingConfig = {
  // Serving endpoint configuration
  serveEnabled: process.env.SERVE_ENABLED !== 'false', // Default: true
  servePort: parseInt(process.env.SERVE_PORT || '3000', 10),
  serveHost: process.env.SERVE_HOST || '0.0.0.0',
  
  // Auto-aggregation configuration
  autoAggregateEnabled: process.env.AUTO_AGGREGATE_ENABLED !== 'false', // Default: true
  autoAggregateOnSourceChange: process.env.AUTO_AGGREGATE_ON_SOURCE_CHANGE !== 'false', // Default: true
  autoAggregateDelayMs: parseInt(process.env.AUTO_AGGREGATE_DELAY_MS || '5000', 10),
  
  // Cache control headers
  cacheControlEnabled: process.env.CACHE_CONTROL_ENABLED !== 'false', // Default: true
  cacheMaxAgeSeconds: parseInt(process.env.CACHE_MAX_AGE_SECONDS || '3600', 10),
  
  // Security configuration
  requireAuthForServe: process.env.REQUIRE_AUTH_FOR_SERVE === 'true', // Default: false
  serveAuthToken: process.env.SERVE_AUTH_TOKEN,
  
  // Pi-hole/AdGuard Home specific
  serveRawByDefault: process.env.SERVE_RAW_BY_DEFAULT === 'true', // Default: false
  includeHeaders: process.env.INCLUDE_HEADERS !== 'false', // Default: true
};

// Validate configuration
if (config.requireAuthForServe && !config.serveAuthToken) {
  console.warn('WARNING: REQUIRE_AUTH_FOR_SERVE is true but SERVE_AUTH_TOKEN is not set. Authentication will fail.');
}

if (config.serveAuthToken && config.serveAuthToken.length < 16) {
  console.warn('WARNING: SERVE_AUTH_TOKEN is too short (minimum 16 characters recommended).');
}

export default config;