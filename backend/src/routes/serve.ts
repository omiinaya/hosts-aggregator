import { Router } from 'express';
import { ServeController } from '../controllers/serve.controller';

const router = Router();
const serveController = new ServeController();

// GET /api/serve/hosts - Serve unified hosts file (for Pi-hole/AdGuard Home)
router.get('/hosts', serveController.serveHostsFile.bind(serveController));

// GET /api/serve/hosts/raw - Serve raw hosts file without headers
router.get('/hosts/raw', serveController.serveRawHostsFile.bind(serveController));

// GET /api/serve/hosts/info - Get hosts file information
router.get('/hosts/info', serveController.getHostsFileInfo.bind(serveController));

// GET /api/serve/health - Health check for serving endpoint
router.get('/health', serveController.healthCheck.bind(serveController));

export { router as serveRouter };