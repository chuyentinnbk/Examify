import { NextRequest } from 'next/server';
import { JwtService } from '@/core/security/jwt';
import { AuditLogger } from '@/core/logger/audit-logger';
import { apiSuccess } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cookieToken = req.cookies.get('examify_token')?.value;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookieToken;

  const userId = req.headers.get('x-user-id');
  const clientIp = req.headers.get('x-client-ip') || '127.0.0.1';

  if (token) {
    await JwtService.revokeSession(token);
  }

  if (userId) {
    await AuditLogger.log({
      action: 'LOGOUT',
      entity: 'USER',
      entityId: userId,
      userId,
      clientIp,
    });
  }

  const response = apiSuccess(null, 'Logged out successfully');
  response.cookies.delete('examify_token');

  return response;
}
