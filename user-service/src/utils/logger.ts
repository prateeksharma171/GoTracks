import { env } from "../config/env.js";

type LogLevel = "info" | "warn" | "error";

const colors = {
  reset: "\x1b[0m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m"
} as const;

const levelColors: Record<LogLevel, string> = {
  info: colors.blue,
  warn: colors.yellow,
  error: colors.red
};

const writeLog = (level: LogLevel, message: string, meta?: unknown): void => {
  const timestamp = new Date().toISOString();
  const formattedMessage =
    `${levelColors[level]}[${timestamp}] ` +
    `[${level.toUpperCase()}] ` +
    `[${env.serviceName}]: ${message}${colors.reset}`;

  if (meta !== undefined) {
    console[level](formattedMessage, meta);
    return;
  }

  console[level](formattedMessage);
};

export const logger = {
  info: (message: string, meta?: unknown) => writeLog("info", message, meta),
  warn: (message: string, meta?: unknown) => writeLog("warn", message, meta),
  error: (message: string, meta?: unknown) => writeLog("error", message, meta)
};
