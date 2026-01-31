import { Router } from 'express';
import { sourcesRouter } from './sources';
import { hostsRouter } from './hosts';
import { aggregateRouter } from './aggregate';
import { serveRouter } from './serve';

const router = Router();

// Mount API routes
router.use('/sources', sourcesRouter);
router.use('/hosts', hostsRouter);
router.use('/aggregate', aggregateRouter);
router.use('/serve', serveRouter);

export { router as apiRouter };