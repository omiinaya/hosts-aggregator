import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const aggregationDuration = new client.Histogram({
  name: 'aggregation_duration_seconds',
  help: 'Duration of aggregation operations',
  buckets: [1, 5, 10, 30, 60],
});

export const sourceFetchCounter = new client.Counter({
  name: 'source_fetch_total',
  help: 'Total number of source fetch attempts',
  labelNames: ['status'],
});

export const activeSourcesGauge = new client.Gauge({
  name: 'active_sources',
  help: 'Number of currently enabled sources',
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(aggregationDuration);
register.registerMetric(sourceFetchCounter);
register.registerMetric(activeSourcesGauge);

export { register };
