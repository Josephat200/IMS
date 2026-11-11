import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../config/database.js";
import { authenticate, createSession, developmentLogin, hashPassword, revokeSession, verifyPassword } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

export const router = Router();

router.get("/health/live", (_request, response) => {
  response.json({ status: "ok", service: "ikodi-api" });
});

router.get("/health/ready", async (_request, response, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ status: "ok", database: "reachable" });
  } catch (error) {
    next(error);
  }
});

router.get("/v1/scholarships", async (_request, response, next) => {
  try {
    const scholarships = await prisma.scholarship.findMany({
      where: { status: "PUBLISHED", deadline: { gte: new Date() } },
      orderBy: { deadline: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        provider: true,
        amount: true,
        currency: true,
        deadline: true
      }
    });
    response.json({ data: scholarships });
  } catch (error) {
    next(error);
  }
});

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(8), fullName: z.string().trim().min(2).max(120).optional() });

router.post("/v1/auth/register", async (request, response, next) => {
  try {
    const input = credentialsSchema.parse(request.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) { response.status(409).json({ error: "An account with this email already exists" }); return; }
    const user = await prisma.user.create({ data: { email: input.email.toLowerCase(), fullName: input.fullName ?? input.email.split("@")[0] ?? "Student", passwordHash: hashPassword(input.password), role: "STUDENT" }, select: { id: true, email: true, fullName: true, role: true } });
    response.status(201).json({ data: user, token: await createSession(user.id) });
  } catch (error) { next(error); }
});

router.post("/v1/auth/login", async (request, response, next) => {
  try {
    const input = credentialsSchema.pick({ email: true, password: true }).parse(request.body);
    const developmentUser = developmentLogin(input.email, input.password);
    if (developmentUser) { response.json({ data: developmentUser, token: await createSession(developmentUser.id) }); return; }
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash) || !user.isActive) { response.status(401).json({ error: "Invalid email or password" }); return; }
    response.json({ data: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }, token: await createSession(user.id) });
  } catch (error) { next(error); }
});

router.get("/v1/applications", authenticate, async (request, response, next) => {
  try {
    const applications = await prisma.application.findMany({ where: { userId: request.userId }, orderBy: { updatedAt: "desc" }, include: { scholarship: { select: { id: true, title: true, provider: true, amount: true, currency: true, deadline: true } } } });
    response.json({ data: applications });
  } catch (error) { next(error); }
});

router.post("/v1/applications", authenticate, async (request, response, next) => {
  try {
    const input = z.object({ scholarshipId: z.string().uuid() }).parse(request.body);
    const scholarship = await prisma.scholarship.findFirst({ where: { id: input.scholarshipId, status: "PUBLISHED", deadline: { gte: new Date() } } });
    if (!scholarship) { response.status(404).json({ error: "Scholarship is unavailable" }); return; }
    const application = await prisma.application.create({ data: { userId: request.userId!, scholarshipId: input.scholarshipId, status: "SUBMITTED", submittedAt: new Date() }, include: { scholarship: { select: { title: true } } } });
    response.status(201).json({ data: application });
  } catch (error) { next(error); }
});

router.post("/v1/auth/logout", authenticate, async (request, response, next) => {
  try { await revokeSession(request); response.status(204).send(); } catch (error) { next(error); }
});

router.get("/v1/me", authenticate, async (request, response, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: request.userId }, select: { id: true, email: true, fullName: true, role: true, createdAt: true } });
    if (!user) { response.status(404).json({ error: "User not found" }); return; }
    response.json({ data: user });
  } catch (error) { next(error); }
});

router.get("/v1/admin/overview", authenticate, authorize("SUPER_ADMIN", "INSTITUTION_ADMIN"), async (_request, response, next) => {
  try {
    const [users, applications, scholarships] = await Promise.all([prisma.user.count(), prisma.application.count(), prisma.scholarship.count({ where: { status: "PUBLISHED" } })]);
    response.json({ data: { users, applications, publishedScholarships: scholarships } });
  } catch (error) { next(error); }
});

router.get("/v1/reviews/queue", authenticate, authorize("REVIEWER", "COMMITTEE_MEMBER", "INSTITUTION_ADMIN", "SUPER_ADMIN"), async (_request, response, next) => {
  try {
    const applications = await prisma.application.findMany({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } }, orderBy: { submittedAt: "asc" }, include: { scholarship: { select: { title: true, provider: true, amount: true, currency: true } }, user: { select: { fullName: true, email: true } } } });
    response.json({ data: applications });
  } catch (error) { next(error); }
});

router.post("/v1/applications/:applicationId/review", authenticate, authorize("REVIEWER", "COMMITTEE_MEMBER", "INSTITUTION_ADMIN", "SUPER_ADMIN"), async (request, response, next) => {
  try {
    const applicationId = z.string().uuid().parse(request.params.applicationId);
    const input = z.object({ decision: z.enum(["APPROVED", "REJECTED", "RETURNED"]), score: z.number().int().min(0).max(100).optional(), notes: z.string().trim().max(2000).optional() }).parse(request.body);
    const application = await prisma.application.findUnique({ where: { id: applicationId }, include: { scholarship: true, user: true } });
    if (!application) { response.status(404).json({ error: "Application not found" }); return; }
    const nextStatus = input.decision === "APPROVED" ? "APPROVED" : input.decision === "REJECTED" ? "REJECTED" : "UNDER_REVIEW";
    const result = await prisma.$transaction(async (transaction) => {
      const review = await transaction.review.upsert({ where: { applicationId_reviewerId: { applicationId: application.id, reviewerId: request.userId! } }, update: { decision: input.decision, score: input.score, notes: input.notes }, create: { applicationId: application.id, reviewerId: request.userId!, decision: input.decision, score: input.score, notes: input.notes } });
      await transaction.application.update({ where: { id: application.id }, data: { status: nextStatus } });
      if (input.decision === "APPROVED") await transaction.award.upsert({ where: { applicationId: application.id }, update: { status: "APPROVED", approvedAt: new Date() }, create: { applicationId: application.id, amount: application.scholarship.amount, currency: application.scholarship.currency, status: "APPROVED", approvedAt: new Date() } });
      await transaction.notification.create({ data: { userId: application.userId, title: `Application ${input.decision.toLowerCase()}`, message: `Your application for ${application.scholarship.title} was ${input.decision.toLowerCase()}.`, channel: "IN_APP" } });
      return review;
    });
    response.status(201).json({ data: result });
  } catch (error) { next(error); }
});

router.get("/v1/finance/disbursements", authenticate, authorize("FINANCE_OFFICER", "SIGNATORY", "SUPER_ADMIN"), async (_request, response, next) => {
  try { response.json({ data: await prisma.disbursement.findMany({ orderBy: { createdAt: "desc" }, include: { award: { include: { application: { include: { scholarship: { select: { title: true } }, user: { select: { fullName: true, email: true } } } } } } } }) }); } catch (error) { next(error); }
});

router.post("/v1/awards/:awardId/disburse", authenticate, authorize("FINANCE_OFFICER", "SIGNATORY", "SUPER_ADMIN"), async (request, response, next) => {
  try {
    const awardId = z.string().uuid().parse(request.params.awardId);
    const award = await prisma.award.findUnique({ where: { id: awardId }, include: { application: { include: { user: true, scholarship: true } } } });
    if (!award) { response.status(404).json({ error: "Award not found" }); return; }
    if (award.status !== "APPROVED") { response.status(409).json({ error: "Only approved awards can be disbursed" }); return; }
    const result = await prisma.$transaction(async (transaction) => {
      const reference = `IK-${randomUUID().slice(0, 8).toUpperCase()}`;
      const disbursement = await transaction.disbursement.create({ data: { awardId: award.id, processedBy: request.userId, reference, status: "PAID", processedAt: new Date() } });
      await transaction.award.update({ where: { id: award.id }, data: { status: "DISBURSED" } });
      await transaction.notification.create({ data: { userId: award.application.userId, title: "Award disbursed", message: `Your award for ${award.application.scholarship.title} has been processed.`, channel: "IN_APP" } });
      return disbursement;
    });
    response.status(201).json({ data: result });
  } catch (error) { next(error); }
});

router.get("/v1/notifications", authenticate, async (request, response, next) => {
  try { response.json({ data: await prisma.notification.findMany({ where: { userId: request.userId }, orderBy: { createdAt: "desc" }, take: 50 }) }); } catch (error) { next(error); }
});

router.patch("/v1/notifications/:notificationId/read", authenticate, async (request, response, next) => {
  try { const notificationId = z.string().uuid().parse(request.params.notificationId); const notification = await prisma.notification.updateMany({ where: { id: notificationId, userId: request.userId }, data: { status: "READ", readAt: new Date() } }); response.json({ data: { updated: notification.count === 1 } }); } catch (error) { next(error); }
});

router.get("/v1/messages", authenticate, async (request, response, next) => {
  try { response.json({ data: await prisma.message.findMany({ where: { recipientId: request.userId }, orderBy: { createdAt: "desc" }, take: 50, include: { sender: { select: { fullName: true, role: true } } } }) }); } catch (error) { next(error); }
});