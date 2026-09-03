import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { scheduleEmailJob } from '../queues/emailQueue';

const prisma = new PrismaClient();

export const handleScheduleEmails = async (req: Request, res: Response) => {
  try {
    const { userId, senderEmail, recipients, subject, body, startTime } = req.body;

    const scheduledDate = new Date(startTime);
    const now = new Date();
    const delayMs = Math.max(0, scheduledDate.getTime() - now.getTime());

    const createdJobs = [];

    for (const recipient of recipients) {
      const emailJob = await prisma.emailJob.create({
        data: {
          userId,
          senderEmail,
          recipient,
          subject,
          body,
          scheduledAt: scheduledDate,
          status: 'SCHEDULED',
        },
      });

      await scheduleEmailJob(
        {
          jobId: emailJob.id,
          userId,
          senderEmail,
          recipient,
          subject,
          body,
          scheduledAt: scheduledDate.toISOString(),
        },
        delayMs
      );

      createdJobs.push(emailJob);
    }

    return res.status(201).json({ success: true, count: createdJobs.length, jobs: createdJobs });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
