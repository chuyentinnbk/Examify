import { Queue } from 'bullmq';
import { MailJobData } from './types';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  enableOfflineQueue: false,
  maxRetriesPerRequest: null,
};

export const EMAIL_QUEUE_NAME = 'examify-email-queue';

export const emailQueue = new Queue<MailJobData>(EMAIL_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 86400, // 7 days
    },
  },
});

emailQueue.on('error', (err) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`⚠️ [BullMQ] Email queue offline: ${err.message}`);
  }
});

export class MailQueueService {
  public static async enqueue(jobData: MailJobData): Promise<string> {
    try {
      const job = await emailQueue.add(jobData.type, jobData, {
        jobId: `mail_${jobData.type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      });
      return job.id || '';
    } catch (err) {
      console.warn('⚠️ [MailQueueService] Could not enqueue email job (Redis offline):', (err as Error).message);
      return '';
    }
  }
}
