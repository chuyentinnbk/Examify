import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/utils';
import { AuditLogger } from '@/core/logger/audit-logger';
import { JwtService } from '@/core/security/jwt';

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
});

export async function POST(req: NextRequest) {
  let userId = req.headers.get('x-user-id');

  if (!userId) {
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('examify_token')?.value;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookieToken;
    if (token) {
      const session = await JwtService.verifySession(token);
      if (session) {
        userId = session.userId;
      }
    }
  }

  if (!userId) {
    return apiError('Authentication required', 401);
  }

  try {
    const body = await req.json();
    const validation = ChangePasswordSchema.safeParse(body);

    if (!validation.success) {
      const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
      return apiError(firstError || 'Dữ liệu không hợp lệ', 422);
    }

    const { currentPassword, newPassword } = validation.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return apiError('Người dùng không tồn tại', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return apiError('Mật khẩu hiện tại không chính xác', 400);
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
      },
    });

    try {
      await AuditLogger.log({
        action: 'PASSWORD_CHANGED',
        entity: 'USER',
        entityId: userId,
        userId,
      });
    } catch {
      // Ignore logger error
    }

    return apiSuccess(null, 'Đổi mật khẩu tài khoản thành công');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi đổi mật khẩu';
    return apiError(message, 500);
  }
}
