import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { JwtService } from '@/core/security/jwt';
import { generateBase32Secret, getTotpAuthUri, generateQRCodeDataURL } from '@/core/security/totp';
import { apiError, apiSuccess } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return apiError('Yêu cầu đăng nhập', 401);
    }

    const session = await JwtService.verifySession(token);
    if (!session) {
      return apiError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return apiError('Người dùng không tồn tại', 404);
    }

    let secret = user.twoFactorSecret;
    if (!secret) {
      secret = generateBase32Secret(20);
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: secret, twoFactorEnabled: false },
      });
    }

    const otpauthUri = getTotpAuthUri(user.email, secret, 'Examify AI');
    const qrCode = await generateQRCodeDataURL(otpauthUri);

    return apiSuccess({
      secret,
      otpauthUri,
      qrCode,
      isEnabled: user.twoFactorEnabled,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Không thể lấy thông tin 2FA';
    return apiError(message, 500);
  }
}
