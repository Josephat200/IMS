import dotenv from "dotenv";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/middleware/authenticate.js";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? path.resolve(process.cwd(), "backend/.env") });

const prisma = new PrismaClient();

const run = async (): Promise<void> => {
	const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
	const adminPassword = process.env.ADMIN_PASSWORD;
	if (adminEmail && adminPassword) await prisma.user.upsert({ where: { email: adminEmail }, update: {}, create: { email: adminEmail, fullName: "IKODI Administrator", passwordHash: hashPassword(adminPassword), role: "SUPER_ADMIN" } });
	if (process.env.NODE_ENV !== "production") {
		const sampleStudents: Array<[string, string]> = [
			["Amina Wanjiku", "amina.wanjiku@students.ikodi.org"],
			["Brian Otieno", "brian.otieno@students.ikodi.org"],
			["Chipo Banda", "chipo.banda@students.ikodi.org"],
			["David Mwangi", "david.mwangi@students.ikodi.org"],
			["Esther Njeri", "esther.njeri@students.ikodi.org"],
			["Farai Moyo", "farai.moyo@students.ikodi.org"],
			["Grace Achieng", "grace.achieng@students.ikodi.org"],
			["Hassan Ali", "hassan.ali@students.ikodi.org"],
			["Irene Kato", "irene.kato@students.ikodi.org"],
			["Joseph Kamau", "joseph.kamau@students.ikodi.org"]
		];
		for (const [index, [fullName, email]] of sampleStudents.entries()) {
			await prisma.user.upsert({
				where: { email },
				update: { fullName, role: "STUDENT", isActive: true },
				create: { email, fullName, passwordHash: hashPassword(`IKODI-Dev-Student-${String(index + 1).padStart(2, "0")}-2026!`), role: "STUDENT" }
			});
		}
	}
	const scholarships = [
		{ title: "STEM Excellence Fund", description: "Support for high-potential students pursuing science, technology, engineering or mathematics.", provider: "IKODI Foundation", amount: 150000, deadline: new Date("2027-03-31") },
		{ title: "Future Leaders Grant", description: "A leadership-focused award for students creating measurable change in their communities.", provider: "Bright Path Trust", amount: 100000, deadline: new Date("2027-05-15") },
		{ title: "Girls in Digital Scholarship", description: "Tuition and mentorship for women building careers in digital technology and innovation.", provider: "Digital Futures Africa", amount: 125000, deadline: new Date("2027-06-30") }
	];
	for (const scholarship of scholarships) {
		const existing = await prisma.scholarship.findFirst({ where: { title: scholarship.title } });
		if (!existing) await prisma.scholarship.create({ data: { ...scholarship, status: "PUBLISHED" } });
	}
};

run().finally(() => prisma.$disconnect());
