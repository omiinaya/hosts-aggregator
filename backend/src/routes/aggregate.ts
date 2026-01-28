import { Router } from 'express';
import { AggregateController } from '../controllers/aggregate.controller';

const router = Router();
const aggregateController = new AggregateController();

// POST /api/aggregate - Trigger aggregation
router.post('/', aggregateController.aggregate.bind(aggregateController));

// GET /api/aggregate - Get latest aggregation result
router.get('/', aggregateController.getAggregated.bind(aggregateController));

// GET /api/aggregate/stats - Get aggregation statistics
router.get('/stats', aggregateController.getAggregationStats.bind(aggregateController));

// GET /api/aggregate/history - Get aggregation history
router.get('/history', aggregateController.getAggregationHistory.bind(aggregateController));

// GET /api/aggregate/status - Get aggregation status
router.get('/status', aggregateController.getAggregationStatus.bind(aggregateController));

export { router as aggregateRouter };
