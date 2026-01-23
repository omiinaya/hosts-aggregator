import { Router } from 'express';
import { sourcesRouter } from './sources';
import { aggregateRouter } from './aggregate';

const router = Router();

// Mount API routes
router.use('/sources', sourcesRouter);
router.use('/aggregate', aggregateRouter);

export { router as apiRouter };