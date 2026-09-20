import { NextRequest, NextResponse } from 'next/server';
import { GeoIpResolver, COMMON_COUNTRIES } from '@/core/security/geoip-resolver';
import prisma from '@/lib/db';

const SETTING_KEY_GEOBLOCK = 'SECURITY_GEOBLOCK_CONFIG';
const SETTING_KEY_RATELIMIT = 'SECURITY_RATELIMIT_CONFIG';

export async function GET() {
  try {
    let geoConfig = GeoIpResolver.getConfig();
    let rateConfig = {
      windowSeconds: parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60', 10),
      authMaxRequests: 20,
      apiMaxRequests: 120,
      retryAfterSeconds: 60,
    };

    try {
      const geoSetting = await prisma.systemSetting.findUnique({
        where: { key: SETTING_KEY_GEOBLOCK },
      });
      if (geoSetting?.value) {
        const parsed = JSON.parse(geoSetting.value);
        geoConfig = GeoIpResolver.updateConfig(parsed);
      }

      const rateSetting = await prisma.systemSetting.findUnique({
        where: { key: SETTING_KEY_RATELIMIT },
      });
      if (rateSetting?.value) {
        rateConfig = { ...rateConfig, ...JSON.parse(rateSetting.value) };
      }
    } catch {
      // Use in-memory if DB is unreachable
    }

    return NextResponse.json({
      success: true,
      data: {
        geoBlocking: geoConfig,
        rateLimiting: rateConfig,
        availableCountries: COMMON_COUNTRIES,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { geoBlocking, rateLimiting } = body;

    let updatedGeo = GeoIpResolver.getConfig();
    if (geoBlocking) {
      updatedGeo = GeoIpResolver.updateConfig(geoBlocking);
      try {
        await prisma.systemSetting.upsert({
          where: { key: SETTING_KEY_GEOBLOCK },
          update: { value: JSON.stringify(updatedGeo) },
          create: {
            key: SETTING_KEY_GEOBLOCK,
            value: JSON.stringify(updatedGeo),
            description: 'Geo-blocking rules (Whitelist/Blacklist/IP)',
          },
        });
      } catch (dbErr) {
        console.warn('Could not save geo-block setting to database:', dbErr);
      }
    }

    if (rateLimiting) {
      try {
        await prisma.systemSetting.upsert({
          where: { key: SETTING_KEY_RATELIMIT },
          update: { value: JSON.stringify(rateLimiting) },
          create: {
            key: SETTING_KEY_RATELIMIT,
            value: JSON.stringify(rateLimiting),
            description: 'Rate limiting thresholds',
          },
        });
      } catch (dbErr) {
        console.warn('Could not save rate-limit setting to database:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Đã lưu cấu hình Bảo mật Geo-Blocking & Rate Limit thành công!',
      data: {
        geoBlocking: updatedGeo,
        rateLimiting,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Simulator Tester endpoint
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { ip, country, customConfig } = body;

    const testIp = ip || '127.0.0.1';
    const testCountry = country || GeoIpResolver.resolve(testIp);

    const result = GeoIpResolver.evaluateAccess(testIp, testCountry, customConfig);

    return NextResponse.json({
      success: true,
      data: {
        testIp,
        testCountry,
        isAllowed: result.isAllowed,
        reason: result.reason,
        mode: customConfig?.mode || GeoIpResolver.getConfig().mode,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
