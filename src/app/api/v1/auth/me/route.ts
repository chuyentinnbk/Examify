import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return apiError('Unauthorized', 401);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    if (!user) {
      return apiError('User not found', 404);
    }

    const instSetting = await prisma.systemSetting.findUnique({
      where: { key: 'institution_name' },
    });

    const avatarSetting = await prisma.systemSetting.findUnique({
      where: { key: `avatar_style_${userId}` },
    });

    return apiSuccess({
      user: {
        ...user,
        institutionName: instSetting?.value || 'Hệ thống Khảo thí Examify',
        avatarStyle: avatarSetting?.value || 'identicon',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return apiError(message, 500);
  }
}
