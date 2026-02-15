import { Request, Response, NextFunction } from 'express';
import { errorMiddleware, createError, AppError } from '../error.middleware';
import { logger } from '../../utils/logger';

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Error Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockError: AppError;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      url: '/test',
      path: '/test',
      headers: {},
      ip: '127.0.0.1',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    mockError = createError('Test error', 500);
    jest.clearAllMocks();
  });

  describe('errorMiddleware', () => {
    it('should handle error with custom status code', () => {
      const error = createError('Bad request', 400);

      errorMiddleware(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Bad request',
      });
    });

    it('should default to 500 for unknown errors', () => {
      errorMiddleware(mockError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Test error',
      });
    });

    it('should handle ValidationError', () => {
      const error = new Error('Validation failed') as AppError;
      error.name = 'ValidationError';

      errorMiddleware(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation Error',
      });
    });

    it('should handle CastError', () => {
      const error = new Error('Invalid ID') as AppError;
      error.name = 'CastError';

      errorMiddleware(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid ID',
      });
    });

    it('should handle P2002 Prisma error (duplicate entry)', () => {
      const error = new Error('Duplicate') as AppError;
      error.code = 'P2002';

      errorMiddleware(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Duplicate entry',
      });
    });

    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = createError('Dev error', 500);

      errorMiddleware(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = createError('Prod error', 500);

      errorMiddleware(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Prod error',
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('createError', () => {
    it('should create an error with statusCode and isOperational', () => {
      const error = createError('Custom error', 400);

      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });
  });
});
