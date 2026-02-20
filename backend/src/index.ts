/// <reference types="./types/express" />
import { app } from './app';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '3010', 10);

console.log('========================================');
console.log('Hosts Aggregator Backend');
console.log('Starting server...');
console.log('========================================');

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ API available at http://0.0.0.0:${PORT}/api`);
  console.log(`✓ Health check at http://0.0.0.0:${PORT}/health`);
  logger.info(`Server running on port ${PORT}`);
});