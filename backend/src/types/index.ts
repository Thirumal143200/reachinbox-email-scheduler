export type EmailStatusType = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';

export type SlackConnectionStatusType = 'CONNECTED' | 'DISCONNECTED';

export interface UserSession {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatar?: string | null;
}

export interface ScheduleEmailInput {
  recipients: string[];
  subject: string;
  body: string;
  startTime: string; // ISO string or epoch ms
  delayBetweenEmailsMs?: number;
  hourlyLimit?: number;
  senderId?: string;
  senderEmail?: string;
  senderName?: string;
}

export interface EmailJobData {
  emailId: string;
  userId: string;
  senderId: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  body: string;
  hourlyLimit: number;
  minDelayMs: number;
}
