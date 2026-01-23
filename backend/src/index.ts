import { app } from './app';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '3010', 10);

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
});