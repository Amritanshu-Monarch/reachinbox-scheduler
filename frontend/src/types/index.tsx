export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface EmailJob {
  id: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string;
  status: 'SCHEDULED' | 'SENT' | 'FAILED' | 'DELAYED_RATE_LIMIT';
  errorMessage?: string;
}

export interface SchedulePayload {
  userId: string;
  senderEmail: string;
  recipients: string[];
  subject: string;
  body: string;
  startTime: string;
  delayBetweenMs: number;
  hourlyLimit: number;
}
