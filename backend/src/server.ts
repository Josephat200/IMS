import { app } from "./app.js";
import { prisma } from "./config/database.js";
import { environment } from "./config/environment.js";
import { logger } from "./config/logger.js";

const server = app.listen(environment.PORT, () => {
  logger.info({ port: environment.PORT, environment: environment.NODE_ENV }, "IKODI API started");
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));