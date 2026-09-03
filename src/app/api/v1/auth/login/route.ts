import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { JwtService } from '@/core/security/jwt';
import { AuditLogger } from '@/core/logger/audit-logger';
import { apiError, apiSuccess } from '@/lib/utils';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = LoginSchema.safeParse(body);

    if (!validation.success) {
      return apiError(validation.error.flatten().fieldErrors, 422, 'Invalid login credentials');
    }

    const { email, password } = validation.data;
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      await AuditLogger.securityAlert(
        'LOGIN_FAILED_INVALID_USER',
        { attemptedEmail: email },
        { ip: clientIp, userAgent }
      );
      return apiError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await AuditLogger.securityAlert(
        'LOGIN_FAILED_WRONG_PASSWORD',
        { userId: user.id, email: user.email },
        { ip: clientIp, userAgent, userId: user.id }
      );
      return apiError('Invalid email or password', 401);
    }

    const session = await JwtService.createSession(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
      {
        ipAddress: clientIp,
        userAgent,
      }
    );

    await AuditLogger.log({
      action: 'LOGIN_SUCCESS',
      entity: 'USER',
      entityId: user.id,
      userId: user.id,
      clientIp,
      userAgent,
    });

    return apiSuccess({
      token: session.token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      expiresAt: session.expiresAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return apiError(message, 500);
  }
}
