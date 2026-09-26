import { NextRequest, NextResponse } from 'next/server';
import { EdgeJwtService } from './core/security/edge-jwt';
import { EdgeRateLimiter } from './core/security/edge-rate-limiter';
import { GeoIpResolver } from './core/security/geoip-resolver';

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - assets (static assets: CSS, JS, images)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|assets|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};

/**
 * Extracts real client IP address from proxy headers.
 */
function extractClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map((ip) => ip.trim());
    if (ips[0]) return ips[0];
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = extractClientIp(req);
  const country = GeoIpResolver.resolve(ip, req.headers.get('x-country-code'));

  // ----------------------------------------------------------------------------
  // 1. Geo-Blocking Evaluation (Location & IP Guard)
  // ----------------------------------------------------------------------------
  const geoResult = GeoIpResolver.evaluateAccess(ip, country);
  if (!geoResult.isAllowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Geo-Blocked: Truy cập bị từ chối theo chính sách giới hạn địa lý & IP.',
        reason: geoResult.reason,
        client: {
          ip: geoResult.ip,
          country: geoResult.country,
        },
      },
      {
        status: 403,
        headers: {
          'X-Client-IP': ip,
          'X-Client-Country': country,
          'X-Geo-Blocked': 'true',
        },
      }
    );
  }

  // ----------------------------------------------------------------------------
  // 2. Rate Limiting Check (Edge Sliding Window Log)
  // ----------------------------------------------------------------------------
  const isAuthRoute = pathname.startsWith('/api/v1/auth');
  const routeCategory = isAuthRoute ? 'auth' : pathname.startsWith('/api') ? 'api' : 'web';

  const rateLimitConfig = isAuthRoute
    ? { windowSeconds: 60, maxRequests: 20 }
    : { windowSeconds: 60, maxRequests: 120 };

  const rateResult = EdgeRateLimiter.check(ip, routeCategory, rateLimitConfig);

  if (!rateResult.isAllowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please slow down.',
        rateLimit: {
          limit: rateResult.limit,
          remaining: 0,
          retryAfterSeconds: Math.ceil((rateResult.resetTimeMs - Date.now()) / 1000),
        },
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateResult.resetTimeMs - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': rateResult.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(rateResult.resetTimeMs / 1000).toString(),
          'X-Client-IP': ip,
          'X-Client-Country': country,
        },
      }
    );
  }

  // ----------------------------------------------------------------------------
  // 2. JWT Authentication & Session Header Enrichment for Protected Routes
  // ----------------------------------------------------------------------------
  const isProtectedApi =
    pathname === '/api/v1/auth/me' ||
    pathname === '/api/v1/auth/change-password' ||
    pathname === '/api/v1/auth/profile' ||
    pathname === '/api/v1/auth/logout' ||
    pathname.startsWith('/api/v1/auth/2fa') ||
    pathname.startsWith('/api/v1/exams') ||
    pathname.startsWith('/api/v1/curriculum') ||
    pathname.startsWith('/api/v1/admin') ||
    pathname.startsWith('/api/v1/ai');

  if (isProtectedApi) {
    // Extract Bearer token from header or cookie
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('examify_token')?.value;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : cookieToken;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required. Missing Bearer token or session cookie.',
        },
        { status: 401 }
      );
    }

    // Verify token using Web Crypto EdgeJwtService
    const session = await EdgeJwtService.verify(token);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired session token.',
        },
        { status: 401 }
      );
    }

    // Role-based authorization for Admin routes
    if (pathname.startsWith('/api/v1/admin') && session.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied. Administrator privileges required.',
        },
        { status: 403 }
      );
    }

    // Enrich request headers for downstream API handlers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', session.userId);
    requestHeaders.set('x-user-email', session.email);
    requestHeaders.set('x-user-role', session.role);
    requestHeaders.set('x-user-fullname', encodeURIComponent(session.fullName));
    requestHeaders.set('x-client-ip', ip);
    requestHeaders.set('x-client-country', country);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // ----------------------------------------------------------------------------
  // 3. Passthrough with GeoIP and Rate Limit Headers
  // ----------------------------------------------------------------------------
  const response = NextResponse.next();
  response.headers.set('X-Client-IP', ip);
  response.headers.set('X-Client-Country', country);
  response.headers.set('X-RateLimit-Limit', rateResult.limit.toString());
  response.headers.set('X-RateLimit-Remaining', rateResult.remaining.toString());

  return response;
}
