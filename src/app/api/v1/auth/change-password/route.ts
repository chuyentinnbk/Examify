import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/utils';
import { AuditLogger } from '@/core/logger/audit-logger';

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
});

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return apiError('Authentication required', 401);
  }

  try {
    const body = await req.json();
    const validation = ChangePasswordSchema.safeParse(body);

    if (!validation.success) {
      return apiError(validation.error.flatten().fieldErrors, 422, 'Invalid payload');
    }

    const { currentPassword, newPassword } = validation.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return apiError('User not found', 404);
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

    await AuditLogger.log({
      action: 'PASSWORD_CHANGED',
      entity: 'USER',
      entityId: userId,
      userId,
    });

    return apiSuccess(null, 'Đổi mật khẩu tài khoản thành công');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error changing password';
    return apiError(message, 500);
  }
}
