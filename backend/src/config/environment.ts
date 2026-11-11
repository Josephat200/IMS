import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? path.resolve(process.cwd(), "backend/.env") });

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:5173"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  TRUST_PROXY: z.enum(["true", "false"]).default("false").transform((value) => value === "true")
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  console.error("Invalid environment configuration", parsedEnvironment.error.flatten().fieldErrors);
  process.exit(1);
}

export const environment = parsedEnvironment.data;