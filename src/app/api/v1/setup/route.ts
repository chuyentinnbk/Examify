import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import redis, { REDIS_KEYS } from '@/lib/redis';
import { JwtService } from '@/core/security/jwt';
import { AuditLogger } from '@/core/logger/audit-logger';
import { MailQueueService } from '@/core/mail/mail.queue';
import { apiError, apiSuccess } from '@/lib/utils';
import { Role } from '@prisma/client';

const SetupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().min(2, 'Full name is required'),
  institutionName: z.string().min(2, 'Institution name is required'),
});

/**
 * GET /api/v1/setup
 * Checks whether initial setup is required or already completed.
 */
export async function GET() {
  try {
    const adminCount = await prisma.user.count({
      where: { role: Role.ADMIN },
    });

    const initSetting = await prisma.systemSetting.findUnique({
      where: { key: 'is_initialized' },
    });

    const isInitialized = adminCount > 0 && initSetting?.value === 'true';

    return apiSuccess({
      isInitialized,
      setupRequired: !isInitialized,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database query error';
    return apiError(message, 500, 'Failed to query setup status');
  }
}

/**
 * POST /api/v1/setup
 * Creates the first ADMIN user, initializes curriculum base data, and permanently locks the setup endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = SetupSchema.safeParse(body);

    if (!validation.success) {
      return apiError(validation.error.flatten().fieldErrors, 422, 'Validation failed');
    }

    const { email, password, fullName, institutionName } = validation.data;
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // 1. Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: Role.ADMIN },
    });

    const systemSetting = await prisma.systemSetting.findUnique({
      where: { key: 'is_initialized' },
    });

    let adminUser = existingAdmin;

    // If an admin already exists:
    if (existingAdmin) {
      // If same email, check password to allow recovery/completion from a previous failed Redis attempt
      if (existingAdmin.email.toLowerCase() === email.toLowerCase()) {
        const isMatch = await bcrypt.compare(password, existingAdmin.passwordHash);
        if (!isMatch) {
          return apiError('System has already been initialized with this admin account. Invalid password.', 403);
        }
        // Valid recovery: continue with existing admin account
      } else {
        return apiError('System has already been initialized. Setup endpoint is permanently locked.', 403);
      }
    } else {
      // 2. Hash password with secure salt rounds
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // 3. Execute atomic transaction to initialize system in database
      adminUser = await prisma.$transaction(async (tx) => {
        // Create first ADMIN user
        const admin = await tx.user.create({
          data: {
            email: email.toLowerCase(),
            passwordHash,
            fullName,
            role: Role.ADMIN,
            isActive: true,
          },
        });

        // Write system initialization flags
        await tx.systemSetting.upsert({
          where: { key: 'is_initialized' },
          create: {
            key: 'is_initialized',
            value: 'true',
            isLocked: true,
            description: 'Tracks whether the primary administrator account has been provisioned.',
          },
          update: {
            value: 'true',
            isLocked: true,
          },
        });

        await tx.systemSetting.upsert({
          where: { key: 'institution_name' },
          create: {
            key: 'institution_name',
            value: institutionName,
            isLocked: false,
            description: 'Official name of the school or academic institution.',
          },
          update: {
            value: institutionName,
          },
        });

        // Seed default curriculum levels if empty
        const existingLevels = await tx.curriculumLevel.count();
        if (existingLevels === 0) {
          await tx.curriculumLevel.createMany({
            data: [
              { name: 'Primary Education (Tiểu học)', code: 'PRIMARY', order: 1 },
              { name: 'Lower Secondary (THCS)', code: 'LOWER_SEC', order: 2 },
              { name: 'Upper Secondary (THPT)', code: 'UPPER_SEC', order: 3 },
            ],
          });
        }

        return admin;
      });
    }

    if (!adminUser) {
      return apiError('Could not provision or resolve admin user', 500);
    }

    // 4. Update Redis initialization cache (safely)
    try {
      await redis.setex(REDIS_KEYS.SYSTEM_INITIALIZED, 86400, 'true');
    } catch {
      // Ignore Redis cache failure
    }

    // 5. Create active JWT and Redis Session (with built-in fail-safe)
    const session = await JwtService.createSession(
      {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        fullName: adminUser.fullName,
      },
      {
        ipAddress: clientIp,
        userAgent,
      }
    );

    // 6. Record dual-channel audit log (safely)
    try {
      await AuditLogger.log({
        action: 'SYSTEM_INITIALIZED',
        entity: 'SYSTEM',
        entityId: adminUser.id,
        userId: adminUser.id,
        clientIp,
        userAgent,
        details: {
          adminEmail: adminUser.email,
          adminName: adminUser.fullName,
          institutionName,
        },
      });
    } catch {
      // Ignore logger failure
    }

    // 7. Enqueue background welcome email via BullMQ (safely)
    try {
      await MailQueueService.enqueue({
        type: 'WELCOME_ADMIN',
        to: adminUser.email,
        recipientName: adminUser.fullName,
        subject: `Welcome to Examify - ${institutionName}`,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
      });
    } catch {
      // Ignore email queue failure if Redis/SMTP is offline
    }

    return apiSuccess(
      {
        token: session.token,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          fullName: adminUser.fullName,
          role: adminUser.role,
        },
        expiresAt: session.expiresAt,
      },
      'System initialized successfully. Welcome to Examify AI.',
      {},
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'System initialization failed';
    return apiError(message, 500);
  }
}
