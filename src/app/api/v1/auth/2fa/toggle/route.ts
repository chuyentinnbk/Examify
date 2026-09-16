import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { JwtService } from '@/core/security/jwt';
import { verifyTOTP } from '@/core/security/totp';
import { apiError, apiSuccess } from '@/lib/utils';

const Toggle2FASchema = z.object({
  action: z.enum(['enable', 'disable']),
  code: z.string().optional(),
});

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const validation = Toggle2FASchema.safeParse(body);
    if (!validation.success) {
      return apiError(validation.error.flatten().fieldErrors, 422, 'Dữ liệu không hợp lệ');
    }

    const { action, code } = validation.data;
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return apiError('Người dùng không tồn tại', 404);
    }

    if (action === 'enable') {
      if (!code || code.trim().length !== 6) {
        return apiError('Vui lòng nhập mã OTP 6 số từ Google Authenticator để xác nhận kích hoạt', 400);
      }

      if (!user.twoFactorSecret) {
        return apiError('Chưa khởi tạo khóa bảo mật Google Authenticator. Vui lòng quét lại mã QR.', 400);
      }

      const isValid = verifyTOTP(user.twoFactorSecret, code.trim());
      if (!isValid) {
        return apiError('Mã xác thực không chính xác hoặc đã hết hạn. Vui lòng thử lại với mã mới nhất.', 400);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true },
      });

      return apiSuccess({ isEnabled: true }, 'Đã kích hoạt xác thực 2 bước (Google Authenticator) thành công!');
    }

    if (action === 'disable') {
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: false },
      });

      return apiSuccess({ isEnabled: false }, 'Đã tắt tính năng xác thực 2 bước (2FA).');
    }

    return apiError('Hành động không hợp lệ', 400);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Thao tác 2FA thất bại';
    return apiError(message, 500);
  }
}
