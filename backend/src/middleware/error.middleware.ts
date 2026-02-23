import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  code?: string;
}

const errorMiddleware = (error: AppError, req: Request, res: Response, _next: NextFunction) => {
  // Always log errors to console regardless of environment
  console.error(`[ERROR] ${req.method} ${req.path}:`, error);
  console.error(error.stack);

  // Set defaults
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    logger.error(`Error middleware caught: ${error.message}`, {
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
  }

  if (error.name === 'ValidationError') {
    error.statusCode = 400;
    error.message = 'Validation Error';
  }

  if (error.name === 'CastError') {
    error.statusCode = 400;
    error.message = 'Invalid ID';
  }

  if (error.code === 'P2002') {
    error.statusCode = 409;
    error.message = 'Duplicate entry';
  }

  res.status(error.statusCode).json({
    status: error.status,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

export { errorMiddleware };

export const createError = (message: string, statusCode: number): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};
