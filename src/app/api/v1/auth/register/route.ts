import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { JwtService } from '@/core/security/jwt';
import { AuditLogger } from '@/core/logger/audit-logger';
import { apiError, apiSuccess } from '@/lib/utils';
import { Role } from '@prisma/client';

const RegisterSchema = z.object({
  fullName: z.string().min(2, 'Họ và tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  school: z.string().optional(),
  department: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = RegisterSchema.safeParse(body);

    if (!validation.success) {
      return apiError(
        validation.error.flatten().fieldErrors,
        422,
        'Thông tin đăng ký không hợp lệ'
      );
    }

    const { fullName, email, password, school, department } = validation.data;
    const clientIp =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return apiError(
        'Email này đã được đăng ký trên hệ thống. Vui lòng đăng nhập hoặc sử dụng email khác.',
        409
      );
    }

    // 2. Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Create teacher user account
    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: Role.TEACHER,
        isActive: true,
        twoFactorEnabled: false,
      },
    });

    // 4. Save optional school and department in SystemSetting
    if (school?.trim()) {
      try {
        await prisma.systemSetting.upsert({
          where: { key: `school_${user.id}` },
          update: { value: school.trim() },
          create: { key: `school_${user.id}`, value: school.trim() },
        });
      } catch {
        // non-blocking
      }
    }

    if (department?.trim()) {
      try {
        const deptSetting = await prisma.systemSetting.findUnique({
          where: { key: 'teacher_departments' },
        });
        const deptMap: Record<string, string> = deptSetting ? JSON.parse(deptSetting.value) : {};
        deptMap[user.id] = department.trim();
        deptMap[`${user.id}_role`] = 'Giáo viên bộ môn';

        await prisma.systemSetting.upsert({
          where: { key: 'teacher_departments' },
          update: { value: JSON.stringify(deptMap) },
          create: { key: 'teacher_departments', value: JSON.stringify(deptMap) },
        });
      } catch {
        // non-blocking
      }
    }

    // 5. Create authenticated session token
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

    // 6. Record audit log
    await AuditLogger.log({
      action: 'USER_REGISTERED',
      entity: 'USER',
      entityId: user.id,
      userId: user.id,
      clientIp,
      userAgent,
    });

    return apiSuccess(
      {
        token: session.token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          institutionName: school?.trim() || 'Hệ thống Khảo thí Examify',
          twoFactorEnabled: false,
        },
        expiresAt: session.expiresAt,
      },
      'Đăng ký tài khoản giáo viên thành công!'
    );
  } catch (error) {
    console.error('Registration error:', error);
    return apiError(
      'Không thể hoàn tất đăng ký: ' + (error instanceof Error ? error.message : String(error)),
      500
    );
  }
}
