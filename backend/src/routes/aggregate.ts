import { Router } from 'express';
import { AggregateController } from '../controllers/aggregate.controller';

const router = Router();
const aggregateController = new AggregateController();

// GET /api/aggregate - Get latest aggregation result
router.get('/', aggregateController.getAggregated.bind(aggregateController));

// GET /api/aggregate/stats - Get aggregation statistics
router.get('/stats', aggregateController.getAggregationStats.bind(aggregateController));

// GET /api/aggregate/history - Get aggregation history
router.get('/history', aggregateController.getAggregationHistory.bind(aggregateController));

// POST /api/aggregate/cleanup - Clean up old files
router.post('/cleanup', aggregateController.cleanup.bind(aggregateController));

export { router as aggregateRouter };