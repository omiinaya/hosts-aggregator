import { authService, AuthUser } from '../auth.service';
import { prisma } from '../../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const hashedPassword = 'hashedpassword123';
      const mockUser = {
        id: 'user-1',
        email: userData.email,
        name: userData.name,
        role: 'viewer',
      };

      const mockToken = 'jwt-token-123';

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const result = await authService.register(userData);

      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result.token).toBe(mockToken);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          role: 'viewer',
        },
      });
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(authService.register(userData)).rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    it('should login user successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-1',
        email: loginData.email,
        name: 'Test User',
        role: 'viewer',
        password: 'hashedpassword',
      };

      const mockToken = 'jwt-token-123';

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, lastLoginAt: new Date() });

      const result = await authService.login(loginData);

      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result.token).toBe(mockToken);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should throw error for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nonexistent@example.com', password: 'pass' })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for invalid password', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedpassword',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrongpassword' })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid JWT token', () => {
      const mockPayload = { userId: 'user-1', email: 'test@example.com', role: 'viewer' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = authService.verifyToken('valid-token');

      expect(result).toEqual({
        id: mockPayload.userId,
        email: mockPayload.email,
        role: mockPayload.role,
      });
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
    });

    it('should throw error for invalid token', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => authService.verifyToken('invalid-token')).toThrow('Invalid token');
    });
  });

  describe('generateApiKey', () => {
    it('should generate API key for user', async () => {
      const userId = 'user-1';
      const mockApiKey = 'api-key-123';

      (jwt.sign as jest.Mock).mockReturnValue(mockApiKey);
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: userId, apiKey: mockApiKey });

      const result = await authService.generateApiKey(userId);

      expect(result).toBe(mockApiKey);
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId, type: 'api-key' },
        expect.any(String),
        { expiresIn: '365d' }
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { apiKey: mockApiKey },
      });
    });
  });

  describe('verifyApiKey', () => {
    it('should verify valid API key', async () => {
      const apiKey = 'valid-api-key';
      const mockPayload = { userId: 'user-1', type: 'api-key' };
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'viewer',
        apiKey: apiKey,
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.verifyApiKey(apiKey);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockPayload.userId },
      });
    });

    it('should return null for invalid API key type', async () => {
      const apiKey = 'valid-api-key';
      const mockPayload = { userId: 'user-1', type: 'jwt-token' };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = await authService.verifyApiKey(apiKey);

      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      const apiKey = 'valid-api-key';
      const mockPayload = { userId: 'user-1', type: 'api-key' };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await authService.verifyApiKey(apiKey);

      expect(result).toBeNull();
    });

    it('should return null when API key does not match', async () => {
      const apiKey = 'valid-api-key';
      const mockPayload = { userId: 'user-1', type: 'api-key' };
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        apiKey: 'different-api-key',
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.verifyApiKey(apiKey);

      expect(result).toBeNull();
    });

    it('should return null for invalid JWT signature', async () => {
      const apiKey = 'invalid-api-key';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const result = await authService.verifyApiKey(apiKey);

      expect(result).toBeNull();
    });
  });
});
