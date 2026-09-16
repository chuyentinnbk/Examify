import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import prisma from '@/lib/db';

const logsDirectory =
  process.env.STORAGE_LOGS_PATH ||
  path.join(process.cwd(), 'storage', 'logs');

// ------------------------------------------------------------------------------
// Winston Rotating File Transports
// ------------------------------------------------------------------------------

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

const appRotateTransport = new DailyRotateFile({
  filename: path.join(logsDirectory, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: fileFormat,
});

const securityRotateTransport = new DailyRotateFile({
  filename: path.join(logsDirectory, 'security-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '90d',
  format: fileFormat,
  level: 'warn',
});

const errorRotateTransport = new DailyRotateFile({
  filename: path.join(logsDirectory, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '60d',
  format: fileFormat,
  level: 'error',
});

export const fileLogger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    appRotateTransport,
    securityRotateTransport,
    errorRotateTransport,
  ],
});

// ------------------------------------------------------------------------------
// Dual-Channel Audit Logger (Disk + MariaDB)
// ------------------------------------------------------------------------------

export interface AuditEventPayload {
  action: string;
  entity: string;
  entityId?: string | null;
  userId?: string | null;
  clientIp?: string | null;
  country?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
  level?: 'info' | 'warn' | 'error';
}

export class AuditLogger {
  /**
   * Logs an audit event synchronously to Winston rotating disk files,
   * and dispatches an asynchronous background write to MariaDB.
   */
  public static async log(event: AuditEventPayload): Promise<void> {
    const level = event.level || 'info';

    // 1. Write structured JSON to rotating log file
    fileLogger.log(level, `[AUDIT] ${event.action} on ${event.entity}`, {
      action: event.action,
      entity: event.entity,
      entityId: event.entityId,
      userId: event.userId,
      clientIp: event.clientIp,
      country: event.country,
      details: event.details,
    });

    // 2. Persist asynchronously to MariaDB AuditLog table
    try {
      await prisma.auditLog.create({
        data: {
          action: event.action,
          entity: event.entity,
          entityId: event.entityId || null,
          userId: event.userId || null,
          clientIp: event.clientIp || null,
          country: event.country || null,
          userAgent: event.userAgent || null,
          details: event.details ? JSON.stringify(event.details) : null,
        },
      });
    } catch (dbError) {
      fileLogger.error('❌ [AuditLogger] Failed to write audit event to MariaDB:', {
        dbError,
        event,
      });
    }
  }

  public static async securityAlert(
    action: string,
    details: Record<string, unknown>,
    clientInfo?: { ip?: string; country?: string; userAgent?: string; userId?: string }
  ): Promise<void> {
    await this.log({
      action,
      entity: 'SECURITY',
      userId: clientInfo?.userId,
      clientIp: clientInfo?.ip,
      country: clientInfo?.country,
      userAgent: clientInfo?.userAgent,
      details,
      level: 'warn',
    });
  }
}
