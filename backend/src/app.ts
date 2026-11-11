import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { environment } from "./config/environment.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { router } from "./routes/index.js";

export const app = express();
const frontendPath = [path.resolve(process.cwd(), "frontend/public"), path.resolve(process.cwd(), "../frontend/public"), path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../frontend/public")].find((candidate) => existsSync(candidate)) ?? path.resolve(process.cwd(), "frontend/public");

app.disable("x-powered-by");
app.set("trust proxy", environment.TRUST_PROXY);
app.use(helmet({ contentSecurityPolicy: { directives: { scriptSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", "data:", "https://images.pexels.com"] } } }));
app.use(cors({ origin: (requestOrigin, callback) => { if (!requestOrigin || requestOrigin === environment.FRONTEND_ORIGIN || requestOrigin === "null") callback(null, true); else callback(new Error("Origin is not allowed")); }, credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-8", legacyHeaders: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(pinoHttp({ logger }));
app.use(express.static(frontendPath));
app.use("/api", router);
app.use((request, response) => request.accepts("html") ? response.sendFile(path.join(frontendPath, "index.html")) : response.status(404).json({ error: "Not found" }));
app.use(errorHandler);