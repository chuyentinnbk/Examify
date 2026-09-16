import jwt from 'jsonwebtoken';
import redis, { REDIS_KEYS } from '@/lib/redis';
import { Role } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  fullName: string;
  sessionId: string;
}

export interface SessionData {
  userId: string;
  email: string;
  role: Role;
  fullName: string;
  sessionId: string;
  createdAt: string;
  userAgent?: string;
  ipAddress?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_dev_secret_replace_in_production_min_32_bytes';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds

export class JwtService {
  /**
   * Signs a new JWT and registers active session state in Redis (with resilient fallback).
   */
  public static async createSession(
    user: { id: string; email: string; role: Role; fullName: string },
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<{ token: string; sessionId: string; expiresAt: Date }> {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      sessionId,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    const sessionData: SessionData = {
      ...payload,
      createdAt: new Date().toISOString(),
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
    };

    // Store in Redis with TTL (fail-safe if Redis is offline)
    try {
      await redis.setex(
        REDIS_KEYS.SESSION(sessionId),
        SESSION_TTL_SECONDS,
        JSON.stringify(sessionData)
      );
    } catch (redisError) {
      console.warn('⚠️ [JwtService] Redis session caching failed, using signed JWT claims fallback:', (redisError as Error).message);
    }

    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

    return { token, sessionId, expiresAt };
  }

  /**
   * Verifies token signature AND verifies Redis session if available.
   */
  public static async verifySession(token: string): Promise<SessionData | null> {
    try {
      // 1. Decode & verify cryptographic signature first
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      if (!decoded || !decoded.sessionId) {
        return null;
      }

      // 2. Check blacklist & active session in Redis if connected
      try {
        const isBlacklisted = await redis.get(REDIS_KEYS.TOKEN_BLACKLIST(token));
        if (isBlacklisted) {
          return null;
        }

        const rawSession = await redis.get(REDIS_KEYS.SESSION(decoded.sessionId));
        if (rawSession) {
          return JSON.parse(rawSession) as SessionData;
        }
      } catch {
        // Fallback: If Redis is offline, trust the verified cryptographic signature
      }

      // Return session data reconstructed from verified token payload
      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        fullName: decoded.fullName,
        sessionId: decoded.sessionId,
        createdAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Invalidates a session immediately from Redis and blacklists the token.
   */
  public static async revokeSession(token: string, sessionId?: string): Promise<void> {
    try {
      const pipeline = redis.pipeline();
      pipeline.setex(REDIS_KEYS.TOKEN_BLACKLIST(token), 86400, 'revoked');

      if (sessionId) {
        pipeline.del(REDIS_KEYS.SESSION(sessionId));
      } else {
        try {
          const decoded = jwt.decode(token) as TokenPayload | null;
          if (decoded?.sessionId) {
            pipeline.del(REDIS_KEYS.SESSION(decoded.sessionId));
          }
        } catch {
          // ignore decode error
        }
      }

      await pipeline.exec();
    } catch (error) {
      console.warn('⚠️ [JwtService] Error revoking session in Redis:', (error as Error).message);
    }
  }

  /**
   * Signs a short-lived temporary token (10 minutes) for 2FA verification after password check
   */
  public static createPending2FAToken(payload: { userId: string; email: string }): string {
    return jwt.sign({ ...payload, is2FAPending: true }, JWT_SECRET, { expiresIn: '10m' });
  }

  /**
   * Verifies the short-lived 2FA temporary token
   */
  public static verifyPending2FAToken(token: string): { userId: string; email: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      if (!decoded || !decoded.is2FAPending || !decoded.userId) {
        return null;
      }
      return { userId: decoded.userId as string, email: decoded.email as string };
    } catch {
      return null;
    }
  }
}

