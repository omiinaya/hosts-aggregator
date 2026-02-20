/**
 * Configuration Routes
 *
 * Routes for configuration import/export operations:
 * - Export configuration
 * - Import configuration
 * - Validate configuration
 * - Preview imports
 */

import { Router } from 'express';
import { configController } from '../controllers/config.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { SECURITY, ERROR_CODES } from '../config/constants';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: SECURITY.MAX_FILE_UPLOAD_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    // Accept only JSON files
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'));
    }
  },
});

// Rate limiting for import operations (stricter than general API)
const importRateLimit = rateLimit({
  windowMs: SECURITY.RATE_LIMIT_WINDOW,
  max: 10, // 10 imports per window
  message: {
    status: 'error',
    message: 'Too many import attempts, please try again later',
    code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// Export Routes
// ============================================================================

// GET /api/config/export - Export configuration as JSON
router.get('/export', authenticate, configController.exportConfig.bind(configController));

// GET /api/config/export/download - Export configuration as downloadable file
router.get(
  '/export/download',
  authenticate,
  configController.exportConfigDownload.bind(configController)
);

// POST /api/config/export/partial - Export selected sources only
router.post(
  '/export/partial',
  authenticate,
  configController.exportPartialConfig.bind(configController)
);

// ============================================================================
// Import Routes
// ============================================================================

// POST /api/config/import - Import configuration from JSON body
router.post(
  '/import',
  authenticate,
  importRateLimit,
  configController.importConfig.bind(configController)
);

// POST /api/config/import/upload - Import configuration from uploaded file
router.post(
  '/import/upload',
  authenticate,
  importRateLimit,
  upload.single('configFile'),
  configController.importConfigUpload.bind(configController)
);

// ============================================================================
// Validation & Preview Routes
// ============================================================================

// POST /api/config/validate - Validate configuration without importing
router.post('/validate', authenticate, configController.validateConfig.bind(configController));

// POST /api/config/preview - Preview import (dry run)
router.post('/preview', authenticate, configController.previewImport.bind(configController));

// ============================================================================
// Status & Management Routes
// ============================================================================

// GET /api/config/status - Get import/export status
router.get('/status', authenticate, configController.getStatus.bind(configController));

// POST /api/config/reset - Reset configuration (admin only)
router.post(
  '/reset',
  authenticate,
  requireAdmin,
  configController.resetConfig.bind(configController)
);

export default router;
