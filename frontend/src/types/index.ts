export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
}

export interface Sender {
  id: string;
  email: string;
  displayName: string;
}

export interface EmailRecord {
  id: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailStatus;
  jobId?: string | null;
  attempts: number;
  error?: string | null;
  etherealPreviewUrl?: string | null;
  createdAt: string;
  sender?: {
    email: string;
    displayName: string;
  };
}

export interface SlackStatus {
  connected: boolean;
  teamName?: string;
  teamId?: string;
  channel?: string;
  connectedAt?: string;
}

export interface SchedulePayload {
  recipients: string[];
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmailsMs: number;
  hourlyLimit: number;
  senderEmail?: string;
  senderName?: string;
}
