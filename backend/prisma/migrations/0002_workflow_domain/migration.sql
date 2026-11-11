ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'GUARDIAN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'COMMITTEE_MEMBER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SIGNATORY';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'AUDITOR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPPORT_STAFF';
CREATE TYPE "ReviewDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED');
CREATE TYPE "AwardStatus" AS ENUM ('PENDING', 'APPROVED', 'DISBURSED', 'CANCELLED');
CREATE TYPE "DisbursementStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED');
CREATE TYPE "DocumentType" AS ENUM ('IDENTITY', 'ADMISSION', 'ACADEMIC_RESULT', 'FINANCIAL', 'OTHER');
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS');
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'READ', 'FAILED');

CREATE TABLE "Review" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "applicationId" TEXT NOT NULL, "reviewerId" TEXT NOT NULL,
  "decision" "ReviewDecision" NOT NULL DEFAULT 'PENDING', "score" INTEGER, "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Award" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "applicationId" TEXT NOT NULL, "amount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KES', "status" "AwardStatus" NOT NULL DEFAULT 'PENDING', "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Disbursement" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "awardId" TEXT NOT NULL, "processedBy" TEXT,
  "reference" TEXT NOT NULL, "status" "DisbursementStatus" NOT NULL DEFAULT 'PENDING', "processedAt" TIMESTAMP(3), "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Disbursement_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Document" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "userId" TEXT NOT NULL, "applicationId" TEXT, "scholarshipId" TEXT,
  "type" "DocumentType" NOT NULL DEFAULT 'OTHER', "fileName" TEXT NOT NULL, "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL, "sizeBytes" INTEGER NOT NULL, "verified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "userId" TEXT NOT NULL, "title" TEXT NOT NULL, "message" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP', "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
  "sentAt" TIMESTAMP(3), "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Message" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "senderId" TEXT NOT NULL, "recipientId" TEXT NOT NULL,
  "subject" TEXT NOT NULL, "body" TEXT NOT NULL, "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Review_applicationId_reviewerId_key" ON "Review"("applicationId", "reviewerId");
CREATE INDEX "Review_reviewerId_decision_idx" ON "Review"("reviewerId", "decision");
CREATE UNIQUE INDEX "Award_applicationId_key" ON "Award"("applicationId");
CREATE UNIQUE INDEX "Disbursement_awardId_key" ON "Disbursement"("awardId");
CREATE UNIQUE INDEX "Disbursement_reference_key" ON "Disbursement"("reference");
CREATE INDEX "Document_userId_createdAt_idx" ON "Document"("userId", "createdAt");
CREATE INDEX "Document_applicationId_type_idx" ON "Document"("applicationId", "type");
CREATE INDEX "Notification_userId_status_createdAt_idx" ON "Notification"("userId", "status", "createdAt");
CREATE INDEX "Message_recipientId_readAt_createdAt_idx" ON "Message"("recipientId", "readAt", "createdAt");
ALTER TABLE "Review" ADD CONSTRAINT "Review_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Award" ADD CONSTRAINT "Award_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "Award"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;