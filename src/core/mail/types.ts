export type MailJobType =
  | 'WELCOME_ADMIN'
  | 'TEACHER_INVITE'
  | 'EXAM_GENERATED'
  | 'PASSWORD_RESET'
  | 'SECURITY_ALERT';

export interface BaseMailPayload {
  to: string;
  subject: string;
  recipientName?: string;
}

export interface WelcomeAdminPayload extends BaseMailPayload {
  type: 'WELCOME_ADMIN';
  dashboardUrl: string;
}

export interface TeacherInvitePayload extends BaseMailPayload {
  type: 'TEACHER_INVITE';
  temporaryPassword?: string;
  loginUrl: string;
}

export interface ExamGeneratedPayload extends BaseMailPayload {
  type: 'EXAM_GENERATED';
  examId: string;
  examTitle: string;
  examType: string;
  questionCount: number;
  viewUrl: string;
}

export interface SecurityAlertPayload extends BaseMailPayload {
  type: 'SECURITY_ALERT';
  alertType: string;
  eventTime: string;
  clientIp: string;
  details: string;
}

export type MailJobData =
  | WelcomeAdminPayload
  | TeacherInvitePayload
  | ExamGeneratedPayload
  | SecurityAlertPayload;
