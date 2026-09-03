datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String             @id @default(uuid())
  email         String             @unique
  name          String?
  avatar        String?
  slackAuth     SlackIntegration?
  emailJobs     EmailJob[]
  createdAt     DateTime           @default(now())
}

model SlackIntegration {
  id          String   @id @default(uuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  webhookUrl  String
  accessToken String
  createdAt   DateTime @default(now())
}

enum JobStatus {
  SCHEDULED
  SENT
  FAILED
  DELAYED_RATE_LIMIT
}

model EmailJob {
  id           String    @id @default(uuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id])
  senderEmail  String
  recipient    String
  subject      String
  body         String
  scheduledAt  DateTime
  sentAt       DateTime?
  status       JobStatus @default(SCHEDULED)
  errorMessage String?
  createdAt    DateTime  @default(now())
}
