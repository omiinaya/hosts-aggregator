import { Router } from 'express';
import { SourcesController } from '../controllers/sources.controller';
import { validateCreateSource, validateUpdateSource, validateIdParam } from '../middleware/validation.middleware';

const router = Router();
const sourcesController = new SourcesController();

// GET /api/sources - List all sources
router.get('/', sourcesController.getAllSources.bind(sourcesController));

// GET /api/sources/:id - Get specific source
router.get('/:id', validateIdParam, sourcesController.getSourceById.bind(sourcesController));

// POST /api/sources - Create new source
router.post('/', validateCreateSource, sourcesController.createSource.bind(sourcesController));

// PUT /api/sources/:id - Update source
router.put('/:id', validateIdParam, validateUpdateSource, sourcesController.updateSource.bind(sourcesController));

// DELETE /api/sources/:id - Delete source
router.delete('/:id', validateIdParam, sourcesController.deleteSource.bind(sourcesController));

// PATCH /api/sources/:id/toggle - Toggle source enabled status
router.patch('/:id/toggle', validateIdParam, sourcesController.toggleSource.bind(sourcesController));

// POST /api/sources/:id/refresh - Refresh source
router.post('/:id/refresh', validateIdParam, sourcesController.refreshSource.bind(sourcesController));

// POST /api/sources/:id/refresh-cache - Refresh cache for specific source
router.post('/:id/refresh-cache', validateIdParam, sourcesController.refreshCache.bind(sourcesController));

// POST /api/sources/refresh-cache - Refresh cache for all sources
router.post('/refresh-cache', sourcesController.refreshAllCache.bind(sourcesController));

export { router as sourcesRouter };