import { jwtVerify, SignJWT } from 'jose';

export interface EdgeTokenPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'TEACHER';
  fullName: string;
  sessionId: string;
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_dev_secret_replace_in_production_min_32_bytes'
);

export class EdgeJwtService {
  /**
   * Verifies JWT in Next.js Edge Middleware using Web Crypto API.
   */
  public static async verify(token: string): Promise<EdgeTokenPayload | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return payload as unknown as EdgeTokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Edge-compatible token generator.
   */
  public static async sign(payload: EdgeTokenPayload, expiresIn = '7d'): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(JWT_SECRET);
  }
}
