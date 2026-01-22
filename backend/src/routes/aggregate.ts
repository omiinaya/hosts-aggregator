import { Router } from 'express';
import { AggregateController } from '../controllers/aggregate.controller';

const router = Router();
const aggregateController = new AggregateController();

// POST /api/aggregate - Trigger aggregation
router.post('/', aggregateController.aggregate.bind(aggregateController));

// GET /api/aggregated - Get latest aggregation result
router.get('/', aggregateController.getAggregated.bind(aggregateController));

// GET /api/aggregated/download/:id - Download unified hosts file
router.get('/download/:id', aggregateController.downloadAggregated.bind(aggregateController));

// GET /api/aggregated/stats - Get aggregation statistics
router.get('/stats', aggregateController.getAggregationStats.bind(aggregateController));

// GET /api/aggregated/history - Get aggregation history
router.get('/history', aggregateController.getAggregationHistory.bind(aggregateController));

// POST /api/aggregated/cleanup - Clean up old files
router.post('/cleanup', aggregateController.cleanup.bind(aggregateController));

export { router as aggregateRouter };