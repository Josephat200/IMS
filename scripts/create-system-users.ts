import dotenv from "dotenv";
import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient, UserRole } from "@prisma/client";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? path.resolve(process.cwd(), "backend/.env") });

const prisma = new PrismaClient();
const resetExisting = process.env.RESET_SYSTEM_USERS === "true";
const configuredPassword = process.env.SYSTEM_USER_PASSWORD;
const developmentPasswords: Partial<Record<UserRole, string>> = {
  SUPER_ADMIN: "IKODI-Dev-SuperAdmin-2026!",
  INSTITUTION_ADMIN: "IKODI-Dev-Admin-2026!",
  SPONSOR: "IKODI-Dev-Sponsor-2026!",
  REVIEWER: "IKODI-Dev-Reviewer-2026!",
  FINANCE_OFFICER: "IKODI-Dev-Finance-2026!",
  GUARDIAN: "IKODI-Dev-Guardian-2026!",
  COMMITTEE_MEMBER: "IKODI-Dev-Committee-2026!",
  SIGNATORY: "IKODI-Dev-Signatory-2026!",
  AUDITOR: "IKODI-Dev-Auditor-2026!",
  SUPPORT_STAFF: "IKODI-Dev-Support-2026!",
  STUDENT: "IKODI-Dev-Student-2026!"
};
const definitions: Array<{ email: string; fullName: string; role: UserRole }> = [
  { email: "superadmin@ikodi.org", fullName: "IKODI Super Administrator", role: "SUPER_ADMIN" },
  { email: "admin@ikodi.org", fullName: "IKODI Institution Administrator", role: "INSTITUTION_ADMIN" },
  { email: "sponsor@ikodi.org", fullName: "IKODI Sponsor Account", role: "SPONSOR" },
  { email: "reviewer@ikodi.org", fullName: "IKODI Review Officer", role: "REVIEWER" },
  { email: "finance@ikodi.org", fullName: "IKODI Finance Officer", role: "FINANCE_OFFICER" },
  { email: "guardian@ikodi.org", fullName: "IKODI Guardian Account", role: "GUARDIAN" },
  { email: "committee@ikodi.org", fullName: "IKODI Committee Member", role: "COMMITTEE_MEMBER" },
  { email: "signatory@ikodi.org", fullName: "IKODI Authorized Signatory", role: "SIGNATORY" },
  { email: "auditor@ikodi.org", fullName: "IKODI Audit Officer", role: "AUDITOR" },
  { email: "support@ikodi.org", fullName: "IKODI Support Staff", role: "SUPPORT_STAFF" },
  { email: "student@ikodi.org", fullName: "IKODI Test Student", role: "STUDENT" }
];

const createPassword = (): string => `${randomBytes(12).toString("base64url")}A9!`;
const hashPassword = (password: string): string => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`; };

const run = async (): Promise<void> => {
  const credentials: Array<{ email: string; password?: string; role: UserRole; status: string }> = [];
  for (const definition of definitions) {
    const existing = await prisma.user.findUnique({ where: { email: definition.email } });
    if (existing && !resetExisting) {
      credentials.push({ email: definition.email, role: definition.role, status: "EXISTS - password unchanged" });
      continue;
    }
    const password = configuredPassword ?? (process.env.NODE_ENV === "development" ? developmentPasswords[definition.role] : undefined) ?? createPassword();
    await prisma.user.upsert({ where: { email: definition.email }, update: { fullName: definition.fullName, role: definition.role, passwordHash: hashPassword(password), isActive: true }, create: { ...definition, passwordHash: hashPassword(password), isActive: true } });
    credentials.push({ email: definition.email, password, role: definition.role, status: existing ? "RESET" : "CREATED" });
  }
  console.log(JSON.stringify({ message: "Store these credentials in an approved secrets manager. Passwords are not recoverable.", credentials }, null, 2));
};

run().catch((error) => { console.error("Unable to provision system users", error); process.exitCode = 1; }).finally(() => prisma.$disconnect());