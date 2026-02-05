import { Router } from 'express';
import { authService } from '../services/auth.service';
import { authenticate } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Email, password, and name are required',
      });
    }

    const result = await authService.register({ email, password, name });

    res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Registration failed',
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    const result = await authService.login({ email, password });

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(401).json({
      error: 'Invalid credentials',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', authenticate, async (req, res) => {
  res.json({
    status: 'success',
    data: {
      user: req.user,
    },
  });
});

/**
 * POST /api/auth/api-key
 * Generate API key
 */
router.post('/api-key', authenticate, async (req, res) => {
  try {
    const apiKey = await authService.generateApiKey(req.user!.id);

    res.json({
      status: 'success',
      data: {
        apiKey,
      },
    });
  } catch (error) {
    logger.error('API key generation error:', error);
    res.status(500).json({
      error: 'Failed to generate API key',
    });
  }
});

export default router;
