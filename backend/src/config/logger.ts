import pino from "pino";
import { environment } from "./environment.js";

export const logger = pino({
  level: environment.LOG_LEVEL,
  redact: ["req.headers.authorization", "req.headers.cookie"],
  base: undefined
});