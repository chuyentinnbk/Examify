import { Worker, Job } from 'bullmq';
import nodemailer, { Transporter } from 'nodemailer';
import { EMAIL_QUEUE_NAME } from './mail.queue';
import { MailJobData } from './types';
import { fileLogger } from '@/core/logger/audit-logger';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  enableOfflineQueue: false,
};

// ------------------------------------------------------------------------------
// Multi-SMTP Transporters (Primary & Backup Fallback)
// ------------------------------------------------------------------------------

function createTransporter(prefix = 'SMTP'): Transporter | null {
  const host = process.env[`${prefix}_HOST`];
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env[`${prefix}_PORT`] || '2525', 10),
    secure: process.env[`${prefix}_SECURE`] === 'true',
    auth: {
      user: process.env[`${prefix}_USER`] || '',
      pass: process.env[`${prefix}_PASSWORD`] || '',
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
  });
}

const primaryTransporter = createTransporter('SMTP');
const backupTransporter = createTransporter('SMTP_BACKUP');

const fromAddress = `"${process.env.SMTP_FROM_NAME || 'Examify AI'}" <${
  process.env.SMTP_FROM_EMAIL || 'noreply@examify.local'
}>`;

// ------------------------------------------------------------------------------
// Email HTML Template Generator
// ------------------------------------------------------------------------------

function generateEmailHtml(job: MailJobData): string {
  const recipient = job.recipientName || 'Valued User';

  switch (job.type) {
    case 'WELCOME_ADMIN':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e293b;">Welcome to Examify AI</h2>
          <p>Hello <strong>${recipient}</strong>,</p>
          <p>Your administrator account has been successfully initialized and the system is now secured.</p>
          <p style="margin: 24px 0;">
            <a href="${job.dashboardUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Access Admin Dashboard
            </a>
          </p>
          <p style="color: #64748b; font-size: 12px;">Examify Automated Security System</p>
        </div>
      `;

    case 'EXAM_GENERATED':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e293b;">Exam Generation Complete</h2>
          <p>Hello <strong>${recipient}</strong>,</p>
          <p>Your exam <strong>"${job.examTitle}"</strong> (${job.examType}) has been generated successfully.</p>
          <ul>
            <li><strong>Total Questions:</strong> ${job.questionCount}</li>
            <li><strong>Exam ID:</strong> ${job.examId}</li>
          </ul>
          <p style="margin: 24px 0;">
            <a href="${job.viewUrl}" style="background-color: #059669; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Review & Export Exam
            </a>
          </p>
        </div>
      `;

    case 'TEACHER_INVITE':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e293b;">Teacher Account Invitation</h2>
          <p>Hello <strong>${recipient}</strong>,</p>
          <p>You have been invited to author exams on the Examify AI platform.</p>
          ${job.temporaryPassword ? `<p><strong>Temporary Password:</strong> <code>${job.temporaryPassword}</code></p>` : ''}
          <p style="margin: 24px 0;">
            <a href="${job.loginUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Sign In to Your Account
            </a>
          </p>
        </div>
      `;

    case 'SECURITY_ALERT':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ef4444; border-radius: 8px;">
          <h2 style="color: #b91c1c;">🚨 Security Alert: ${job.alertType}</h2>
          <p>Hello <strong>${recipient}</strong>,</p>
          <p>A security event occurred on the Examify platform:</p>
          <ul>
            <li><strong>Event Time:</strong> ${job.eventTime}</li>
            <li><strong>Origin IP:</strong> ${job.clientIp}</li>
            <li><strong>Details:</strong> ${job.details}</li>
          </ul>
        </div>
      `;
  }
}

// ------------------------------------------------------------------------------
// BullMQ Mail Worker with Multi-SMTP Fallback
// ------------------------------------------------------------------------------

export const mailWorker = new Worker<MailJobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job<MailJobData>) => {
    fileLogger.info(`📧 [MailWorker] Processing job ${job.id} (${job.data.type}) for ${job.data.to}`);

    const htmlContent = generateEmailHtml(job.data);
    const mailOptions = {
      from: fromAddress,
      to: job.data.to,
      subject: job.data.subject,
      html: htmlContent,
    };

    // Attempt 1: Primary SMTP
    if (primaryTransporter) {
      try {
        const info = await primaryTransporter.sendMail(mailOptions);
        fileLogger.info(`✅ [MailWorker] Sent via Primary SMTP: ${info.messageId}`);
        return { messageId: info.messageId, status: 'delivered', provider: 'primary' };
      } catch (primaryErr) {
        fileLogger.warn(`⚠️ [MailWorker] Primary SMTP failed: ${(primaryErr as Error).message}. Attempting backup SMTP...`);
      }
    }

    // Attempt 2: Backup SMTP
    if (backupTransporter) {
      try {
        const info = await backupTransporter.sendMail(mailOptions);
        fileLogger.info(`✅ [MailWorker] Sent via Backup SMTP: ${info.messageId}`);
        return { messageId: info.messageId, status: 'delivered', provider: 'backup' };
      } catch (backupErr) {
        fileLogger.error(`❌ [MailWorker] Backup SMTP failed: ${(backupErr as Error).message}`);
        throw backupErr;
      }
    }

    fileLogger.warn(`⚠️ [MailWorker] No active SMTP transporter configured. Email job skipped safely.`);
    return { status: 'skipped', reason: 'no_smtp_configured' };
  },
  {
    connection,
    concurrency: 5,
  }
);

mailWorker.on('completed', (job) => {
  fileLogger.info(`[MailWorker] Job ${job.id} completed successfully`);
});

mailWorker.on('failed', (job, err) => {
  fileLogger.error(`[MailWorker] Job ${job?.id} failed after retries:`, err);
});
