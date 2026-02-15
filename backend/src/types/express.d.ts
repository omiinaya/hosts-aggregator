import { AuthUser } from '../services/auth.service';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
