import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/utils';

const ProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  school: z.string().optional(),
  avatarStyle: z.string().optional(),
});

export async function PUT(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return apiError('Authentication required', 401);
  }

  try {
    const body = await req.json();
    const validation = ProfileSchema.safeParse(body);

    if (!validation.success) {
      return apiError(validation.error.flatten().fieldErrors, 422, 'Invalid data');
    }

    const { fullName, school, avatarStyle } = validation.data;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        twoFactorEnabled: true,
      },
    });

    if (school) {
      await prisma.systemSetting.upsert({
        where: { key: 'institution_name' },
        update: { value: school },
        create: { key: 'institution_name', value: school },
      });
    }

    if (avatarStyle) {
      await prisma.systemSetting.upsert({
        where: { key: `avatar_style_${userId}` },
        update: { value: avatarStyle },
        create: { key: `avatar_style_${userId}`, value: avatarStyle },
      });
    }

    return apiSuccess(
      {
        user: {
          ...updatedUser,
          institutionName: school || 'Hệ thống Khảo thí Examify',
          avatarStyle,
        },
      },
      'Cập nhật thông tin hồ sơ thành công'
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error updating profile';
    return apiError(message, 500);
  }
}
