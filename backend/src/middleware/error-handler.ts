import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { logger } from "../config/logger.js";

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (error instanceof Prisma.PrismaClientInitializationError || error instanceof Prisma.PrismaClientRustPanicError) {
    response.status(503).json({ error: "Database unavailable. Start PostgreSQL and verify DATABASE_URL." });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    response.status(409).json({ error: "That record already exists" });
    return;
  }
  if (error instanceof ZodError) {
    response.status(400).json({ error: "Validation failed", details: error.flatten() });
    return;
  }

  logger.error({ err: error, method: request.method, path: request.path }, "Unhandled request error");
  response.status(500).json({ error: "Internal server error", requestId: request.id });
};