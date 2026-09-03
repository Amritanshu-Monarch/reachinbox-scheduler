import { Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { redisConnection, EMAIL_QUEUE_NAME, EmailJobPayload, emailQueue } from '../queues/emailQueue';
import { indexEmailInElasticsearch } from '../services/elasticsearch';
import axios from 'axios';

const prisma = new PrismaClient();

const MIN_DELAY_MS = parseInt(process.env.INTER_EMAIL_DELAY_MS || '2000', 10);
const MAX_EMAILS_PER_HOUR = parseInt(process.env.MAX_EMAILS_PER_HOUR || '200', 10);
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);

// Fake SMTP Transporter using Ethereal
const transporter = nodemailer.createTransport({
  host: process.env.ETHEREAL_HOST || 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: process.env.ETHEREAL_USER,
    pass: process.env.ETHEREAL_PASS,
  },
});

const getHourlyWindowKey = (senderEmail: string): string => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const date = now.getUTCDate();
  const hour = now.getUTCHour();
  return `ratelimit:${senderEmail}:${year}-${month}-${date}-${hour}`;
};

const notifySlackRateLimit = async (userId: string, senderEmail: string, count: number) => {
  try {
    const slackConfig = await prisma.slackIntegration.findUnique({ where: { userId } });
    if (!slackConfig || !slackConfig.webhookUrl) return;

    await axios.post(slackConfig.webhookUrl, {
      text: `⚠️ *Rate Limit Reached*: Sender \`${senderEmail}\` hit the limit of ${count}/${MAX_EMAILS_PER_HOUR} emails this hour. Remaining scheduled jobs have been delayed to the next hour window.`,
    });
  } catch (err) {
    console.error('Slack notification failed silently:', err);
  }
};

export const emailWorker = new Worker<EmailJobPayload>(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobPayload>) => {
    const { jobId, userId, senderEmail, recipient, subject, body } = job.data;
    const rateLimitKey = getHourlyWindowKey(senderEmail);

    // Atomic Redis Counter Increment
    const currentCount = await redisConnection.incr(rateLimitKey);
    if (currentCount === 1) {
      await redisConnection.expire(rateLimitKey, 3600); // Expire key after 1 hour window
    }

    // Rate Limit Breached: Delay job into the next hour window
    if (currentCount > MAX_EMAILS_PER_HOUR) {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setUTCHours(now.getUTCHour() + 1, 0, 0, 0);
      const delayUntilNextHour = nextHour.getTime() - now.getTime();

      console.warn(`[RateLimit] Breached for ${senderEmail}. Rescheduling job ${jobId} in ${delayUntilNextHour}ms`);

      // Trigger Slack alert on first breach boundary
      if (currentCount === MAX_EMAILS_PER_HOUR + 1) {
        await notifySlackRateLimit(userId, senderEmail, MAX_EMAILS_PER_HOUR);
      }

      // Re-queue job into next window
      await emailQueue.add('send-email', job.data, {
        delay: delayUntilNextHour,
        jobId: `${jobId}-rescheduled-${Date.now()}`,
      });

      await prisma.emailJob.update({
        where: { id: jobId },
        data: { status: 'DELAYED_RATE_LIMIT' },
      });

      return { status: 'rescheduled' };
    }

    // Minimum delay between emails to mimic real-world provider throttling
    await new Promise((resolve) => setTimeout(resolve, MIN_DELAY_MS));

    // Execute Email Sending
    try {
      const info = await transporter.sendMail({
        from: senderEmail,
        to: recipient,
        subject,
        text: body,
      });

      const sentAt = new Date();

      // Update Database
      await prisma.emailJob.update({
        where: { id: jobId },
        data: { status: 'SENT', sentAt },
      });

      // Index in Elasticsearch
      await indexEmailInElasticsearch({
        id: jobId,
        userId,
        senderEmail,
        recipient,
        subject,
        body,
        status: 'SENT',
        sentAt: sentAt.toISOString(),
      });

      return { status: 'sent', messageId: info.messageId };
    } catch (error: any) {
      await prisma.emailJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', errorMessage: error.message },
      });
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: WORKER_CONCURRENCY,
  }
);
