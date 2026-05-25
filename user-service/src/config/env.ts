import dotenv from "dotenv";
import type { SignOptions } from "jsonwebtoken";

dotenv.config();

const getRequiredEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const parseAllowedOrigins = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const getJwtExpiry = (
  key: string,
  fallback: SignOptions["expiresIn"],
): SignOptions["expiresIn"] => {
  return (process.env[key] ?? fallback) as SignOptions["expiresIn"];
};

const getBooleanEnv = (key: string, fallback: boolean): boolean => {
  const value = process.env[key];

  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

export const env = {
  serviceName: getRequiredEnv("SERVICE_NAME"),
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  apiVersion: getRequiredEnv("API_VERSION", "v1"),
  cookieSecret: getRequiredEnv("COOKIE_SECRET"),
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  databaseUrl: getRequiredEnv("DATABASE_URL"),
  redisUsername: getRequiredEnv("REDIS_USERNAME"),
  redisPort: getRequiredEnv("REDIS_PORT"),
  redisHost: getRequiredEnv("REDIS_HOST"),
  redisPassword: getRequiredEnv("REDIS_PASSWORD"),
  accessTokenSecret: getRequiredEnv("ACCESS_TOKEN_SECRET"),
  refreshTokenSecret: getRequiredEnv("REFRESH_TOKEN_SECRET"),
  accessTokenExpiresIn: getJwtExpiry("ACCESS_TOKEN_EXPIRES_IN", "15m"),
  refreshTokenExpiresIn: getJwtExpiry("REFRESH_TOKEN_EXPIRES_IN", "7d"),
  emailOtpExpiresInMinutes: Number(process.env.EMAIL_OTP_EXPIRES_IN_MINUTES ?? 10),
  emailOtpMaxPerHour: Number(process.env.EMAIL_OTP_MAX_PER_HOUR ?? 5),
  smtpHost: getRequiredEnv("SMTP_HOST"),
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: getBooleanEnv("SMTP_SECURE", false),
  smtpRequireTls: getBooleanEnv("SMTP_REQUIRE_TLS", true),
  smtpUser: getRequiredEnv("SMTP_USER"),
  smtpPass: getRequiredEnv("SMTP_PASS"),
  smtpFromEmail: getRequiredEnv("SMTP_FROM_EMAIL"),
  smtpFromName: process.env.SMTP_FROM_NAME ?? "GoTrack Official"
};
