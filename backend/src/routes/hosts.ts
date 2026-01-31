import { Router } from 'express';
import { HostsController } from '../controllers/hosts.controller';

const router = Router();
const hostsController = new HostsController();

// GET /api/hosts - List all hosts with pagination and filtering
router.get('/', hostsController.getAllHosts.bind(hostsController));

// GET /api/hosts/:id - Get specific host details
router.get('/:id', hostsController.getHostById.bind(hostsController));

// PATCH /api/hosts/:id - Update host (enable/disable)
router.patch('/:id', hostsController.updateHost.bind(hostsController));

// PATCH /api/hosts/bulk - Bulk update hosts
router.patch('/bulk', hostsController.bulkUpdateHosts.bind(hostsController));

// POST /api/hosts/bulk-toggle - Toggle multiple hosts
router.post('/bulk-toggle', hostsController.bulkToggleHosts.bind(hostsController));

// GET /api/hosts/stats - Host statistics
router.get('/stats', hostsController.getHostStats.bind(hostsController));

export { router as hostsRouter };
