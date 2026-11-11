const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, "..", "backend", ".env") });

const required = ["DATABASE_URL"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
	console.error(`Missing required environment variables: ${missing.join(", ")}`);
	process.exit(1);
}

try {
	const databaseUrl = new URL(process.env.DATABASE_URL);
	if (databaseUrl.protocol !== "postgres:" && databaseUrl.protocol !== "postgresql:") throw new Error("DATABASE_URL must use PostgreSQL");
} catch (error) {
	console.error(`Invalid DATABASE_URL: ${error.message}`);
	process.exit(1);
}

console.log(`Environment configuration is valid for ${process.env.NODE_ENV || "development"}.`);
