import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { createError } from './error.middleware';

export const validateCreateSource = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  
  body('url')
    .notEmpty()
    .withMessage('URL is required')
    .isURL()
    .withMessage('URL must be a valid URL'),

  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),

  body('format')
    .optional()
    .isIn(['standard', 'adblock', 'auto'])
    .withMessage('Format must be one of: standard, adblock, auto'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = createError('Validation failed', 400);
      error.message = errors.array().map(err => err.msg).join(', ');
      return next(error);
    }
    next();
  }
];

export const validateUpdateSource = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  
  body('url')
    .optional()
    .isURL()
    .withMessage('URL must be a valid URL'),

  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),

  body('format')
    .optional()
    .isIn(['standard', 'adblock', 'auto'])
    .withMessage('Format must be one of: standard, adblock, auto'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = createError('Validation failed', 400);
      error.message = errors.array().map(err => err.msg).join(', ');
      return next(error);
    }
    next();
  }
];

export const validateIdParam = [
  param('id')
    .notEmpty()
    .withMessage('ID parameter is required'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = createError('Invalid ID parameter', 400);
      return next(error);
    }
    next();
  }
];

export const validateSourceUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};