CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'SPONSOR', 'INSTITUTION_ADMIN', 'REVIEWER', 'FINANCE_OFFICER', 'SUPER_ADMIN');
CREATE TYPE "ScholarshipStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN');

CREATE TABLE "User" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "email" TEXT NOT NULL, "fullName" TEXT NOT NULL,
  "passwordHash" TEXT, "role" "UserRole" NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Scholarship" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
  "provider" TEXT NOT NULL, "amount" DECIMAL(14,2) NOT NULL, "currency" TEXT NOT NULL DEFAULT 'KES',
  "deadline" TIMESTAMP(3) NOT NULL, "status" "ScholarshipStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Scholarship_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Application" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "userId" TEXT NOT NULL, "scholarshipId" TEXT NOT NULL,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT', "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "userId" TEXT, "action" TEXT NOT NULL, "entity" TEXT NOT NULL,
  "entityId" TEXT, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Session" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "tokenHash" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Application_userId_scholarshipId_key" ON "Application"("userId", "scholarshipId");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");
CREATE INDEX "Scholarship_status_deadline_idx" ON "Scholarship"("status", "deadline");
CREATE INDEX "Application_status_updatedAt_idx" ON "Application"("status", "updatedAt");
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;