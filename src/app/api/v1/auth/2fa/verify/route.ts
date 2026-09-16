import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { JwtService } from '@/core/security/jwt';
import { AuditLogger } from '@/core/logger/audit-logger';
import { verifyTOTP } from '@/core/security/totp';
import { apiError, apiSuccess } from '@/lib/utils';

const Verify2FASchema = z.object({
  tempToken: z.string().min(1, 'Token phiên 2FA là bắt buộc'),
  code: z.string().length(6, 'Mã Google Authenticator phải có đúng 6 chữ số'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = Verify2FASchema.safeParse(body);

    if (!validation.success) {
      return apiError(validation.error.flatten().fieldErrors, 422, 'Mã OTP không hợp lệ');
    }

    const { tempToken, code } = validation.data;
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // 1. Verify the temporary 2FA token
    const pending = JwtService.verifyPending2FAToken(tempToken);
    if (!pending) {
      return apiError('Phiên xác thực đã hết hạn (quá 10 phút), vui lòng đăng nhập lại', 401);
    }

    // 2. Fetch user
    const user = await prisma.user.findUnique({
      where: { id: pending.userId },
    });

    if (!user || !user.isActive || !user.twoFactorSecret) {
      return apiError('Tài khoản không tồn tại hoặc chưa cài đặt Google Authenticator', 400);
    }

    // 3. Verify TOTP with Google Authenticator standard RFC 6238
    const isValid = verifyTOTP(user.twoFactorSecret, code, 1);

    if (!isValid) {
      await AuditLogger.securityAlert(
        '2FA_VERIFICATION_FAILED',
        { userId: user.id, email: user.email },
        { ip: clientIp, userAgent, userId: user.id }
      );
      return apiError(
        'Mã Google Authenticator không chính xác hoặc đã hết hạn. Vui lòng kiểm tra lại đồng hồ thiết bị và ứng dụng Google Authenticator.',
        400
      );
    }

    // 4. Mark twoFactorEnabled = true if first time
    if (!user.twoFactorEnabled) {
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true },
      });
    }

    // 5. Issue full active JWT session
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
      action: 'LOGIN_SUCCESS_2FA',
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
    const message = error instanceof Error ? error.message : 'Xác thực 2FA thất bại';
    return apiError(message, 500);
  }
}
