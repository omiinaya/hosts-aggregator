import { Request, Response, NextFunction } from 'express';
import { authService, AuthUser } from '../services/auth.service';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Authentication middleware
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // Check for Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = authService.verifyToken(token);
      req.user = user;
      return next();
    }

    // Check for API key
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      const user = await authService.verifyApiKey(apiKey);
      if (user) {
        req.user = user;
        return next();
      }
    }

    return res.status(401).json({ error: 'Authentication required' });
  } catch (error) {
    logger.warn('Authentication failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication middleware
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = authService.verifyToken(token);
      req.user = user;
    }
    next();
  } catch (error) {
    // Continue without user
    next();
  }
}

/**
 * Authorization middleware factory
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.email} with role ${req.user.role}`);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Middleware to require admin role
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to require operator or admin role
 */
export const requireOperator = requireRole('admin', 'operator');

/**
 * Optional authentication middleware
 * Authenticates user if credentials provided, but doesn't require them
 */
export async function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // Check for Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = authService.verifyToken(token);
      req.user = user;
      return next();
    }

    // Check for API key
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      const user = await authService.verifyApiKey(apiKey);
      if (user) {
        req.user = user;
        return next();
      }
    }

    // No authentication provided, continue without user
    next();
  } catch (error) {
    // Invalid credentials, continue without user
    next();
  }
}
