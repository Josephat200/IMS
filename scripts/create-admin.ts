import dotenv from "dotenv";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../backend/src/middleware/authenticate.js";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? path.resolve(process.cwd(), "backend/.env") });

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters");

const prisma = new PrismaClient();
try {
	const user = await prisma.user.upsert({
		where: { email },
		update: { fullName: "IKODI Administrator", passwordHash: hashPassword(password), role: "SUPER_ADMIN", isActive: true },
		create: { email, fullName: "IKODI Administrator", passwordHash: hashPassword(password), role: "SUPER_ADMIN", isActive: true }
	});
	console.log(`Administrator ready: ${user.email}`);
} finally {
	await prisma.$disconnect();
}
