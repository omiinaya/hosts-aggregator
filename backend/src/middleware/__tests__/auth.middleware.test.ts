import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuthenticate } from '../auth.middleware';
import { authService } from '../../services/auth.service';

// Mock auth service
jest.mock('../../services/auth.service', () => ({
  authService: {
    verifyToken: jest.fn(),
    verifyApiKey: jest.fn(),
  },
}));

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate with valid Bearer token', async () => {
      const token = 'valid-jwt-token';
      const mockUser = {
        userId: 'user-1',
        email: 'test@example.com',
        role: 'viewer',
      };

      mockReq.headers = { authorization: `Bearer ${token}` };
      (authService.verifyToken as jest.Mock).mockReturnValue(mockUser);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(authService.verifyToken).toHaveBeenCalledWith(token);
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should authenticate with valid API key', async () => {
      const apiKey = 'valid-api-key';
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'viewer',
      };

      mockReq.headers = { 'x-api-key': apiKey };
      (authService.verifyApiKey as jest.Mock).mockResolvedValue(mockUser);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(authService.verifyApiKey).toHaveBeenCalledWith(apiKey);
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when no authentication provided', async () => {
      mockReq.headers = {};

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid Bearer token format', async () => {
      mockReq.headers = { authorization: 'InvalidFormat token' };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
    });

    it('should return 401 for invalid JWT token', async () => {
      const token = 'invalid-token';
      mockReq.headers = { authorization: `Bearer ${token}` };
      (authService.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
    });

    it('should return 401 for invalid API key', async () => {
      const apiKey = 'invalid-api-key';
      mockReq.headers = { 'x-api-key': apiKey };
      (authService.verifyApiKey as jest.Mock).mockRejectedValue(new Error('Invalid API key'));

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
    });

    it('should prefer Bearer token over API key when both provided', async () => {
      const token = 'valid-jwt-token';
      const mockUser = {
        userId: 'user-1',
        email: 'test@example.com',
        role: 'viewer',
      };

      mockReq.headers = {
        authorization: `Bearer ${token}`,
        'x-api-key': 'api-key',
      };
      (authService.verifyToken as jest.Mock).mockReturnValue(mockUser);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(authService.verifyToken).toHaveBeenCalled();
      expect(authService.verifyApiKey).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuthenticate', () => {
    it('should authenticate when valid token provided', async () => {
      const token = 'valid-jwt-token';
      const mockUser = {
        userId: 'user-1',
        email: 'test@example.com',
        role: 'viewer',
      };

      mockReq.headers = { authorization: `Bearer ${token}` };
      (authService.verifyToken as jest.Mock).mockReturnValue(mockUser);

      await optionalAuthenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without user when no authentication provided', async () => {
      mockReq.headers = {};

      await optionalAuthenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without user when invalid token provided', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      (authService.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await optionalAuthenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
