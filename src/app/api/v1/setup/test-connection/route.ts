import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { AIFactory } from '@/core/ai/ai-factory';
import { apiError, apiSuccess } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, config } = body;

    if (!type || !config) {
      return apiError('Missing connection type or configuration payload', 400);
    }

    const startTime = Date.now();

    switch (type) {
      case 'mysql': {
        const { host, port, user, password, database } = config;
        if (!host || !user || !database) {
          return apiError('Missing required MySQL connection fields (host, user, database)', 400);
        }

        const encodedUser = encodeURIComponent(user);
        const encodedPass = encodeURIComponent(password || '');
        const targetPort = port || 3306;
        const connectionUrl = `mysql://${encodedUser}:${encodedPass}@${host}:${targetPort}/${database}?connect_timeout=5`;

        const testPrisma = new PrismaClient({
          datasources: {
            db: { url: connectionUrl },
          },
        });

        try {
          await testPrisma.$queryRawUnsafe('SELECT 1 AS connection_test');
          const latencyMs = Date.now() - startTime;
          return apiSuccess(
            { latencyMs, database, host },
            `Kết nối MySQL thành công (${latencyMs}ms)!`
          );
        } catch (dbErr: unknown) {
          const errMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
          return NextResponse.json(
            {
              success: false,
              error: `Kết nối MySQL thất bại: ${errMsg}`,
              latencyMs: Date.now() - startTime,
            },
            { status: 400 }
          );
        } finally {
          await testPrisma.$disconnect().catch(() => {});
        }
      }

      case 'redis': {
        const { enabled, host, port, password, db } = config;
        if (enabled === false || !host) {
          return apiSuccess(
            { latencyMs: 0, disabled: true },
            'Redis đang ở chế độ TẮT (Hệ thống sẽ dùng In-Memory Cache an toàn)!'
          );
        }

        const testClient = new Redis({
          host: host || '127.0.0.1',
          port: parseInt(port || '6379', 10),
          password: password || undefined,
          db: parseInt(db || '0', 10),
          connectTimeout: 3000,
          commandTimeout: 3000,
          maxRetriesPerRequest: 1,
          lazyConnect: true,
        });
        testClient.on('error', () => {});

        try {
          await testClient.connect();
          await testClient.ping();
          const latencyMs = Date.now() - startTime;
          return apiSuccess(
            { latencyMs, host: host || '127.0.0.1' },
            `Kết nối Redis thành công (${latencyMs}ms)!`
          );
        } catch (redisErr: unknown) {
          const errMsg = redisErr instanceof Error ? redisErr.message : String(redisErr);
          return NextResponse.json(
            {
              success: false,
              error: `Kết nối Redis thất bại: ${errMsg}`,
              latencyMs: Date.now() - startTime,
            },
            { status: 400 }
          );
        } finally {
          await testClient.quit().catch(() => testClient.disconnect());
        }
      }

      case 'ai': {
        const { provider, apiKey, model, baseURL } = config;
        if (!provider) {
          return apiError('Missing AI provider identifier', 400);
        }

        try {
          const aiInstance = AIFactory.getProvider(provider, {
            apiKey,
            model,
            baseURL,
            timeoutMs: 10000,
          });

          const isConnected = await aiInstance.validateConnection();
          const latencyMs = Date.now() - startTime;
          const keyCount = String(apiKey || '').split(/[,;\n]+/).map((k) => k.trim()).filter(Boolean).length;
          const poolMsg = keyCount > 1 ? ` (KeyPool: ${keyCount} API Keys)` : '';

          if (isConnected) {
            return apiSuccess(
              { latencyMs, provider, model: aiInstance.modelName, keyCount },
              `Kết nối ${provider.toUpperCase()} (${aiInstance.modelName}) thành công (${latencyMs}ms)${poolMsg}!`
            );
          } else {
            return NextResponse.json(
              {
                success: false,
                error: `Không thể xác thực API Key hoặc Model với ${provider.toUpperCase()}. Vui lòng kiểm tra lại Key/Endpoint.`,
                latencyMs,
              },
              { status: 400 }
            );
          }
        } catch (aiErr: unknown) {
          const errMsg = aiErr instanceof Error ? aiErr.message : String(aiErr);
          return NextResponse.json(
            {
              success: false,
              error: `Lỗi kết nối AI Provider: ${errMsg}`,
              latencyMs: Date.now() - startTime,
            },
            { status: 400 }
          );
        }
      }



      default:
        return apiError(`Unsupported connection test type: "${type}"`, 400);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Connection test failed';
    return apiError(message, 500);
  }
}
