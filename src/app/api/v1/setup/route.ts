import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import prisma, { refreshPrismaClient } from '@/lib/db';
import redis, { REDIS_KEYS } from '@/lib/redis';
import { JwtService } from '@/core/security/jwt';
import { AuditLogger } from '@/core/logger/audit-logger';
import { apiError, apiSuccess } from '@/lib/utils';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

const FullSetupSchema = z.object({
  // Admin credentials
  email: z.string().email('Địa chỉ email không hợp lệ'),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có tối thiểu 8 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất một chữ hoa')
    .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một chữ số'),
  fullName: z.string().min(2, 'Vui lòng nhập họ và tên'),
  institutionName: z.string().min(2, 'Vui lòng nhập tên cơ sở giáo dục'),

  // Optional Full Configuration parameters
  database: z
    .object({
      host: z.string().default('localhost'),
      port: z.union([z.string(), z.number()]).default(3306),
      user: z.string().default('examify_user'),
      password: z.string().default(''),
      database: z.string().default('examify_db'),
    })
    .optional(),

  redis: z
    .object({
      enabled: z.boolean().default(false),
      host: z.string().optional().default('localhost'),
      port: z.union([z.string(), z.number()]).optional().default(6379),
      password: z.string().optional().default(''),
      db: z.union([z.string(), z.number()]).optional().default(0),
    })
    .optional(),

  ai: z
    .object({
      defaultProvider: z.string().default('gemini'),
      geminiApiKey: z.string().optional(),
      geminiModel: z.string().default('gemini-1.5-flash'),
      openaiApiKey: z.string().optional(),
      openaiModel: z.string().default('gpt-4o-mini'),
      claudeApiKey: z.string().optional(),
      claudeModel: z.string().default('claude-3-5-sonnet-20241022'),
      customMcpBaseUrl: z.string().optional(),
      customMcpApiKey: z.string().optional(),
      customMcpModel: z.string().optional(),
    })
    .optional(),

  rateLimit: z
    .object({
      windowSeconds: z.union([z.string(), z.number()]).default(60),
      maxRequests: z.union([z.string(), z.number()]).default(100),
    })
    .optional(),
});

/**
 * Parses DATABASE_URL string into components.
 */
function parseDatabaseUrl(urlStr?: string) {
  if (!urlStr) {
    return { host: 'localhost', port: '3306', user: 'examify_user', password: '', database: 'examify_db' };
  }
  try {
    const parsed = new URL(urlStr);
    return {
      host: parsed.hostname || 'localhost',
      port: parsed.port || '3306',
      user: decodeURIComponent(parsed.username || 'examify_user'),
      password: decodeURIComponent(parsed.password || ''),
      database: (parsed.pathname || '/examify_db').replace(/^\//, ''),
    };
  } catch {
    return { host: 'localhost', port: '3306', user: 'examify_user', password: '', database: 'examify_db' };
  }
}

/**
 * Writes or updates the .env file with given key-values.
 */
function updateEnvFile(updates: Record<string, string>) {
  const envPath = path.join(process.cwd(), '.env');
  let currentContent = '';
  if (fs.existsSync(envPath)) {
    currentContent = fs.readFileSync(envPath, 'utf8');
  }

  const lines = currentContent.split('\n');
  const updatedKeys = new Set<string>();

  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) return line;

    const key = line.substring(0, eqIndex).trim();
    if (key in updates) {
      updatedKeys.add(key);
      const val = updates[key];
      // Keep quoting if needed
      return `${key}="${val}"`;
    }
    return line;
  });

  // Append new keys that were not previously present
  for (const [key, val] of Object.entries(updates)) {
    if (!updatedKeys.has(key)) {
      newLines.push(`${key}="${val}"`);
      updatedKeys.add(key);
    }
    // Also update runtime process.env
    process.env[key] = val;
  }

  fs.writeFileSync(envPath, newLines.join('\n'), 'utf8');
}

/**
 * GET /api/v1/setup
 * Checks whether initial setup is required or already completed.
 */
export async function GET() {
  const envDbUrl = process.env.DATABASE_URL;
  const dbComponents = parseDatabaseUrl(envDbUrl);

  const currentConfig = {
    database: dbComponents,
    redis: {
      enabled: process.env.REDIS_ENABLED === 'true' && !!process.env.REDIS_HOST,
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || '6379',
      password: process.env.REDIS_PASSWORD || '',
      db: process.env.REDIS_DB || '0',
    },
    ai: {
      defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'gemini',
      geminiApiKey: process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('YourGemini') ? process.env.GEMINI_API_KEY : '',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      openaiApiKey: process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-openai') ? process.env.OPENAI_API_KEY : '',
      openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      claudeApiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '',
      claudeModel: process.env.CLAUDE_MODEL || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      customMcpBaseUrl: process.env.SELF_HOSTED_AI_BASE_URL || 'http://localhost:11434/v1',
      customMcpApiKey: process.env.SELF_HOSTED_AI_API_KEY || 'ollama',
      customMcpModel: process.env.SELF_HOSTED_AI_MODEL || 'llama3:8b',
    },
    rateLimit: {
      windowSeconds: process.env.RATE_LIMIT_WINDOW_SECONDS || '60',
      maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || '100',
    },
  };

  try {
    // Attempt database query with fail-safe 5s timeout
    const queryDb = async () => {
      const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
      const initSetting = await prisma.systemSetting.findUnique({ where: { key: 'is_initialized' } });
      return adminCount > 0 || initSetting?.value === 'true';
    };

    const isInitialized = await Promise.race([
      queryDb().catch(() => false),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
    ]);

    return apiSuccess({
      isInitialized,
      setupRequired: !isInitialized,
      currentConfig,
    });
  } catch (error: unknown) {
    return apiSuccess({
      isInitialized: false,
      setupRequired: true,
      reason: error instanceof Error ? error.message : 'Database not initialized',
      currentConfig,
    });
  }
}

/**
 * POST /api/v1/setup
 * Saves configuration to .env, syncs database schema, creates the Master ADMIN, and permanently locks setup.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = FullSetupSchema.safeParse(body);

    if (!validation.success) {
      return apiError(validation.error.flatten().fieldErrors, 422, 'Validation failed');
    }

    const { email, password, fullName, institutionName, database, redis: redisConfig, ai, rateLimit } = validation.data;
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // 1. Build and update .env variables
    const envUpdates: Record<string, string> = {};

    if (database) {
      const encodedUser = encodeURIComponent(database.user);
      const encodedPass = encodeURIComponent(database.password || '');
      const dbUrl = `mysql://${encodedUser}:${encodedPass}@${database.host}:${database.port}/${database.database}?connect_timeout=10`;
      envUpdates['DATABASE_URL'] = dbUrl;
    }

    if (redisConfig) {
      const isEnabled = redisConfig.enabled === true && !!redisConfig.host;
      envUpdates['REDIS_ENABLED'] = String(isEnabled);
      if (isEnabled) {
        envUpdates['REDIS_HOST'] = String(redisConfig.host);
        envUpdates['REDIS_PORT'] = String(redisConfig.port || 6379);
        envUpdates['REDIS_PASSWORD'] = String(redisConfig.password || '');
        envUpdates['REDIS_DB'] = String(redisConfig.db || 0);
        envUpdates['REDIS_URL'] = `redis://${redisConfig.host}:${redisConfig.port || 6379}`;
      } else {
        envUpdates['REDIS_HOST'] = '';
        envUpdates['REDIS_PORT'] = '';
        envUpdates['REDIS_PASSWORD'] = '';
        envUpdates['REDIS_URL'] = '';
      }
    }

    if (ai) {
      envUpdates['DEFAULT_AI_PROVIDER'] = ai.defaultProvider;
      if (ai.geminiApiKey) envUpdates['GEMINI_API_KEY'] = ai.geminiApiKey;
      if (ai.geminiModel) envUpdates['GEMINI_MODEL'] = ai.geminiModel;
      if (ai.openaiApiKey) envUpdates['OPENAI_API_KEY'] = ai.openaiApiKey;
      if (ai.openaiModel) envUpdates['OPENAI_MODEL'] = ai.openaiModel;
      if (ai.claudeApiKey) {
        envUpdates['CLAUDE_API_KEY'] = ai.claudeApiKey;
        envUpdates['ANTHROPIC_API_KEY'] = ai.claudeApiKey;
      }
      if (ai.claudeModel) {
        envUpdates['CLAUDE_MODEL'] = ai.claudeModel;
        envUpdates['ANTHROPIC_MODEL'] = ai.claudeModel;
      }
      if (ai.customMcpBaseUrl) envUpdates['SELF_HOSTED_AI_BASE_URL'] = ai.customMcpBaseUrl;
      if (ai.customMcpApiKey) envUpdates['SELF_HOSTED_AI_API_KEY'] = ai.customMcpApiKey;
      if (ai.customMcpModel) envUpdates['SELF_HOSTED_AI_MODEL'] = ai.customMcpModel;
    }

    if (rateLimit) {
      envUpdates['RATE_LIMIT_WINDOW_SECONDS'] = String(rateLimit.windowSeconds);
      envUpdates['RATE_LIMIT_MAX_REQUESTS'] = String(rateLimit.maxRequests);
    }

    // Persist configuration to .env file
    updateEnvFile(envUpdates);

    // 2. Re-instantiate Prisma client with the newly configured database connection
    const effectiveDbUrl = envUpdates['DATABASE_URL'] || process.env.DATABASE_URL;
    if (effectiveDbUrl) {
      await refreshPrismaClient(effectiveDbUrl);
    }

    // 3. Ensure Database Schema is pushed if database is fresh
    try {
      const prismaCliPath = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
      if (fs.existsSync(prismaCliPath)) {
        execSync(`node "${prismaCliPath}" db push --skip-generate --accept-data-loss`, {
          env: { ...process.env, ...envUpdates, DATABASE_URL: effectiveDbUrl },
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 45000,
        });
      } else {
        execSync('npx prisma db push --skip-generate --accept-data-loss', {
          env: { ...process.env, ...envUpdates, DATABASE_URL: effectiveDbUrl },
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 45000,
        });
      }
    } catch (pushErr: unknown) {
      const msg = pushErr instanceof Error ? pushErr.message : String(pushErr);
      console.warn('⚠️ [Setup] Prisma db push output or notice:', msg.slice(0, 300));
    }

    // 4. Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: Role.ADMIN },
    }).catch(() => null);

    const systemSetting = await prisma.systemSetting.findUnique({
      where: { key: 'is_initialized' },
    }).catch(() => null);

    let adminUser = existingAdmin;

    if (existingAdmin && systemSetting?.value === 'true') {
      if (existingAdmin.email.toLowerCase() === email.toLowerCase()) {
        const isMatch = await bcrypt.compare(password, existingAdmin.passwordHash);
        if (!isMatch) {
          return apiError('Hệ thống đã được khởi tạo trước đó với tài khoản này. Mật khẩu không chính xác.', 403);
        }
      } else {
        return apiError('Hệ thống đã được khởi tạo. Trang thiết lập đã bị khóa an toàn.', 403);
      }
    } else {
      // 4. Hash password with secure salt rounds
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // 5. Execute atomic transaction to initialize system in database
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
      return apiError('Không thể khởi tạo tài khoản quản trị viên', 500);
    }

    // 6. Update Redis initialization cache
    try {
      await redis.setex(REDIS_KEYS.SYSTEM_INITIALIZED, 86400, 'true');
    } catch {
      // Ignore Redis cache failure
    }

    // 7. Create active JWT and Redis Session
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

    // 8. Record audit log
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
      'Hệ thống Examify đã được khởi tạo và cấu hình thành công!',
      {},
      201
    );
  } catch (error: unknown) {
    console.error('❌ [Setup Fatal Error]:', error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    const message = error instanceof Error ? error.message : 'Khởi tạo hệ thống thất bại';
    return apiError(message, 500);
  }
}
