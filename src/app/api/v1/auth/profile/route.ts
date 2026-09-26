import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/utils';
import { JwtService } from '@/core/security/jwt';

const ProfileSchema = z.object({
  fullName: z.string().min(2, 'Họ và tên phải có ít nhất 2 ký tự'),
  school: z.string().optional(),
  avatarStyle: z.string().optional(),
});

export async function PUT(req: NextRequest) {
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
    const validation = ProfileSchema.safeParse(body);

    if (!validation.success) {
      const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
      return apiError(firstError || 'Dữ liệu không hợp lệ', 422);
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
    const message = error instanceof Error ? error.message : 'Lỗi khi cập nhật hồ sơ';
    return apiError(message, 500);
  }
}
