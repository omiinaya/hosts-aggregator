import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';
const SALT_ROUNDS = 10;

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<{ user: AuthUser; token: string }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: 'viewer',
      },
    });

    const token = this.generateToken(user);

    logger.info(`User registered: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role as 'admin' | 'operator' | 'viewer',
      },
      token,
    };
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser; token: string }> {
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(credentials.password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.generateToken(user);

    logger.info(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role as 'admin' | 'operator' | 'viewer',
      },
      token,
    };
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: { id: string; email: string; role: string }): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): AuthUser {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        role: 'admin' | 'operator' | 'viewer';
      };

      return {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Generate API key
   */
  async generateApiKey(userId: string): Promise<string> {
    const apiKey = jwt.sign({ userId, type: 'api-key' }, JWT_SECRET, {
      expiresIn: '365d',
    });

    await prisma.user.update({
      where: { id: userId },
      data: { apiKey },
    });

    return apiKey;
  }

  /**
   * Verify API key
   */
  async verifyApiKey(apiKey: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(apiKey, JWT_SECRET) as {
        userId: string;
        type: string;
      };

      if (decoded.type !== 'api-key') {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || user.apiKey !== apiKey) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role as 'admin' | 'operator' | 'viewer',
      };
    } catch (error) {
      return null;
    }
  }
}

export const authService = new AuthService();
