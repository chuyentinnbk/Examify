import { Queue } from 'bullmq';
import { MailJobData } from './types';
import { isRedisConfigured } from '@/lib/redis';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  enableOfflineQueue: false,
  maxRetriesPerRequest: null,
};

export const EMAIL_QUEUE_NAME = 'examify-email-queue';

let emailQueue: Queue<MailJobData> | null = null;

if (isRedisConfigured()) {
  try {
    emailQueue = new Queue<MailJobData>(EMAIL_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 86400,
        },
      },
    });

    emailQueue.on('error', () => {
      // Keep console clean when Redis is temporarily offline
    });
  } catch {
    emailQueue = null;
  }
}

export { emailQueue };

export class MailQueueService {
  public static async enqueue(jobData: MailJobData): Promise<string> {
    if (!emailQueue) {
      // In-memory or direct dispatch fallback
      return `direct_${Date.now()}`;
    }

    try {
      const job = await emailQueue.add(jobData.type, jobData, {
        jobId: `mail_${jobData.type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      });
      return job.id || '';
    } catch {
      return '';
    }
  }
}
