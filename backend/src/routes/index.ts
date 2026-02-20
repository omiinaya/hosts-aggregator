import { Router } from 'express';
import authRouter from './auth';
import { sourcesRouter } from './sources';
import { hostsRouter } from './hosts';
import { aggregateRouter } from './aggregate';
import { serveRouter } from './serve';
import configRouter from './config';
import metricsRouter from './metrics';

const router = Router();

// Mount API routes
router.use('/auth', authRouter);
router.use('/sources', sourcesRouter);
router.use('/hosts', hostsRouter);
router.use('/aggregate', aggregateRouter);
router.use('/serve', serveRouter);
router.use('/config', configRouter);
router.use('/metrics', metricsRouter);

export { router as apiRouter };
