import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { prisma } from "../config/database.js";
import { environment } from "../config/environment.js";

declare global { namespace Express { interface Request { userId?: string; userRole?: UserRole; } } }

export const hashPassword = (password: string): string => {
	const salt = randomBytes(16).toString("hex");
	return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};

export const verifyPassword = (password: string, storedHash: string): boolean => {
	const [salt, hash] = storedHash.split(":");
	if (!salt || !hash) return false;
	const expected = Buffer.from(hash, "hex");
	const actual = scryptSync(password, salt, 64);
	return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const tokenHash = (token: string): string => createHash("sha256").update(token).digest("hex");

const developmentUsers: Array<{ id: string; email: string; fullName: string; password: string; role: UserRole }> = [
	{ id: "dev-super-admin", email: "superadmin@ikodi.org", fullName: "IKODI Super Administrator", password: "IKODI-Dev-SuperAdmin-2026!", role: "SUPER_ADMIN" },
	{ id: "dev-institution-admin", email: "admin@ikodi.org", fullName: "IKODI Institution Administrator", password: "IKODI-Dev-Admin-2026!", role: "INSTITUTION_ADMIN" },
	{ id: "dev-sponsor", email: "sponsor@ikodi.org", fullName: "IKODI Sponsor Account", password: "IKODI-Dev-Sponsor-2026!", role: "SPONSOR" },
	{ id: "dev-reviewer", email: "reviewer@ikodi.org", fullName: "IKODI Review Officer", password: "IKODI-Dev-Reviewer-2026!", role: "REVIEWER" },
	{ id: "dev-finance", email: "finance@ikodi.org", fullName: "IKODI Finance Officer", password: "IKODI-Dev-Finance-2026!", role: "FINANCE_OFFICER" },
	{ id: "dev-guardian", email: "guardian@ikodi.org", fullName: "IKODI Guardian Account", password: "IKODI-Dev-Guardian-2026!", role: "GUARDIAN" },
	{ id: "dev-committee", email: "committee@ikodi.org", fullName: "IKODI Committee Member", password: "IKODI-Dev-Committee-2026!", role: "COMMITTEE_MEMBER" },
	{ id: "dev-signatory", email: "signatory@ikodi.org", fullName: "IKODI Authorized Signatory", password: "IKODI-Dev-Signatory-2026!", role: "SIGNATORY" },
	{ id: "dev-auditor", email: "auditor@ikodi.org", fullName: "IKODI Audit Officer", password: "IKODI-Dev-Auditor-2026!", role: "AUDITOR" },
	{ id: "dev-support", email: "support@ikodi.org", fullName: "IKODI Support Staff", password: "IKODI-Dev-Support-2026!", role: "SUPPORT_STAFF" },
	{ id: "dev-student", email: "student@ikodi.org", fullName: "IKODI Test Student", password: "IKODI-Dev-Student-2026!", role: "STUDENT" }
];
const developmentSessions = new Map<string, { userId: string; expiresAt: Date }>();

export const developmentLogin = (email: string, password: string): { id: string; email: string; fullName: string; role: UserRole } | null => {
	if (environment.NODE_ENV !== "development") return null;
	const user = developmentUsers.find((candidate) => candidate.email === email.toLowerCase() && candidate.password === password);
	return user ? { id: user.id, email: user.email, fullName: user.fullName, role: user.role } : null;
};

export const createSession = async (userId: string): Promise<string> => {
	const token = randomBytes(32).toString("hex");
	if (environment.NODE_ENV === "development" && developmentUsers.some((user) => user.id === userId)) {
		developmentSessions.set(tokenHash(token), { userId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
		return token;
	}
	await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
	await prisma.session.create({ data: { tokenHash: tokenHash(token), userId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
	return token;
};

export const revokeSession = async (request: Request): Promise<void> => {
	const token = request.header("authorization")?.replace(/^Bearer\s+/i, "");
	if (!token) return;
	if (developmentSessions.delete(tokenHash(token))) return;
	await prisma.session.updateMany({ where: { tokenHash: tokenHash(token), revokedAt: null }, data: { revokedAt: new Date() } });
};

export const authenticate = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
	try {
		const token = request.header("authorization")?.replace(/^Bearer\s+/i, "");
		const developmentSession = token ? developmentSessions.get(tokenHash(token)) : undefined;
		if (developmentSession && token) {
			if (developmentSession.expiresAt <= new Date()) { developmentSessions.delete(tokenHash(token)); response.status(401).json({ error: "Authentication required" }); return; }
			const user = developmentUsers.find((candidate) => candidate.id === developmentSession.userId);
			if (!user) { response.status(401).json({ error: "Authentication required" }); return; }
			request.userId = user.id;
			request.userRole = user.role;
			next();
			return;
		}
		const session = token ? await prisma.session.findUnique({ where: { tokenHash: tokenHash(token) }, include: { user: { select: { role: true, isActive: true } } } }) : null;
		if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) { response.status(401).json({ error: "Authentication required" }); return; }
		request.userId = session.userId;
		request.userRole = session.user.role;
		next();
	} catch (error) { next(error); }
};
