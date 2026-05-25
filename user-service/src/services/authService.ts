import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { users, type SelectUser } from "../db/schema/users.js";
import { connectRedis, getRedisClient } from "../redis/index.js";
import { sendOtpEmail } from "./emailService.js";
import { AppError } from "../utils/AppError.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/tokens.js";

type SignupInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type VerifySignupOtpInput = {
  email: string;
  otp: string;
};

type RegenerateSignupOtpInput = {
  email: string;
};

type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isEmailVerified: boolean;
  };
};

type SignupResponse = {
  message: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isEmailVerified: boolean;
  };
  otpExpiresInMinutes: number;
  remainingOtpRequestsInHour: number;
};

const buildOtpRedisKey = (userId: string): string => `auth:email-otp:${userId}`;
const buildOtpRateLimitKey = (userId: string): string =>
  `auth:email-otp:requests:${userId}`;

const generateOtp = (): string => randomInt(100000, 1000000).toString();

const buildAuthPayload = (user: SelectUser): AuthPayload => {
  const tokenPayload = {
    userId: user.id,
    email: user.email,
  };

  return {
    accessToken: generateAccessToken(tokenPayload),
    refreshToken: generateRefreshToken(tokenPayload),
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
    },
  };
};

const storeRefreshToken = async (
  userId: string,
  refreshToken: string,
): Promise<void> => {
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  await db
    .update(users)
    .set({
      refreshTokenHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
};

const storeSignupOtp = async (userId: string, otp: string): Promise<void> => {
  const otpHash = await bcrypt.hash(otp, 10);
  const redisClient = getRedisClient();

  await connectRedis();
  await redisClient.del(buildOtpRedisKey(userId));
  await redisClient.set(buildOtpRedisKey(userId), otpHash, {
    expiration: {
      type: "EX",
      value: env.emailOtpExpiresInMinutes * 60,
    },
  });
};

const consumeOtpRequestQuota = async (userId: string): Promise<number> => {
  const redisClient = getRedisClient();
  const otpRateLimitKey = buildOtpRateLimitKey(userId);

  await connectRedis();
  const totalRequests = await redisClient.incr(otpRateLimitKey);

  if (totalRequests === 1) {
    await redisClient.expire(otpRateLimitKey, 60 * 60);
  }

  if (totalRequests > env.emailOtpMaxPerHour) {
    throw new AppError(
      `You can generate only ${env.emailOtpMaxPerHour} OTPs in one hour. Please try again later.`,
      429,
    );
  }

  return env.emailOtpMaxPerHour - totalRequests;
};

const issueSignupOtp = async (
  userRecord: SelectUser,
  message: string,
): Promise<Pick<SignupResponse, "message" | "otpExpiresInMinutes" | "remainingOtpRequestsInHour">> => {
  const otp = generateOtp();
  const remainingOtpRequestsInHour = await consumeOtpRequestQuota(userRecord.id);

  await storeSignupOtp(userRecord.id, otp);
  await sendOtpEmail({
    to: userRecord.email,
    otp,
    recipientName: `${userRecord.firstName} ${userRecord.lastName}`,
    expiresInMinutes: env.emailOtpExpiresInMinutes,
  });

  return {
    message,
    otpExpiresInMinutes: env.emailOtpExpiresInMinutes,
    remainingOtpRequestsInHour,
  };
};

export const signupUser = async ({
  firstName,
  lastName,
  email,
  password,
}: SignupInput): Promise<SignupResponse> => {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser?.isEmailVerified) {
    throw new AppError("User already exists with this email", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let userRecord: SelectUser;

  if (existingUser) {
    const [updatedUser] = await db
      .update(users)
      .set({
        firstName,
        lastName,
        passwordHash,
        refreshTokenHash: null,
        isEmailVerified: false,
        emailVerificationCode: "",
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id))
      .returning();

    userRecord = updatedUser;
  } else {
    const [createdUser] = await db
      .insert(users)
      .values({
        firstName,
        lastName,
        email,
        passwordHash,
        emailVerificationCode: "",
      })
      .returning();

    userRecord = createdUser;
  }

  const otpDispatch = await issueSignupOtp(
    userRecord,
    "Signup successful. Verify the OTP sent to your email to activate your account.",
  );

  return {
    message: otpDispatch.message,
    user: {
      id: userRecord.id,
      firstName: userRecord.firstName,
      lastName: userRecord.lastName,
      email: userRecord.email,
      isEmailVerified: userRecord.isEmailVerified,
    },
    otpExpiresInMinutes: otpDispatch.otpExpiresInMinutes,
    remainingOtpRequestsInHour: otpDispatch.remainingOtpRequestsInHour,
  };
};

export const regenerateSignupOtp = async ({
  email,
}: RegenerateSignupOtpInput): Promise<Pick<SignupResponse, "message" | "otpExpiresInMinutes" | "remainingOtpRequestsInHour">> => {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!existingUser) {
    throw new AppError("User not found", 404);
  }

  if (existingUser.isEmailVerified) {
    throw new AppError("Email is already verified", 409);
  }

  return issueSignupOtp(
    existingUser,
    "A new OTP has been sent to your email address.",
  );
};

export const loginUser = async ({
  email,
  password,
}: LoginInput): Promise<AuthPayload> => {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!existingUser) {
    throw new AppError("Invalid email or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    existingUser.passwordHash,
  );

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!existingUser.isEmailVerified) {
    throw new AppError("Please verify your email before logging in", 403);
  }

  const authPayload = buildAuthPayload(existingUser);
  await storeRefreshToken(existingUser.id, authPayload.refreshToken);

  return authPayload;
};

export const verifySignupOtp = async ({
  email,
  otp,
}: VerifySignupOtpInput): Promise<AuthPayload> => {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!existingUser) {
    throw new AppError("User not found", 404);
  }

  if (existingUser.isEmailVerified) {
    throw new AppError("Email is already verified", 409);
  }

  const redisClient = getRedisClient();
  await connectRedis();

  const storedOtpHash = await redisClient.get(
    buildOtpRedisKey(existingUser.id),
  );

  if (!storedOtpHash) {
    throw new AppError(
      "OTP expired or not found. Please sign up again to get a new code",
      400,
    );
  }

  const isOtpValid = await bcrypt.compare(otp, storedOtpHash);

  if (!isOtpValid) {
    throw new AppError("Invalid OTP", 400);
  }

  const [verifiedUser] = await db
    .update(users)
    .set({
      isEmailVerified: true,
      emailVerificationCode: "",
      updatedAt: new Date(),
    })
    .where(eq(users.id, existingUser.id))
    .returning();

  await redisClient.del(buildOtpRedisKey(existingUser.id));
  await redisClient.del(buildOtpRateLimitKey(existingUser.id));

  const authPayload = buildAuthPayload(verifiedUser);
  await storeRefreshToken(verifiedUser.id, authPayload.refreshToken);

  return authPayload;
};

export const refreshUserToken = async (
  refreshToken: string,
): Promise<AuthPayload> => {
  const decodedToken = verifyRefreshToken(refreshToken);

  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, decodedToken.userId),
  });

  if (!existingUser || !existingUser.refreshTokenHash) {
    throw new AppError("Invalid refresh token", 401);
  }

  const isRefreshTokenValid = await bcrypt.compare(
    refreshToken,
    existingUser.refreshTokenHash,
  );

  if (!isRefreshTokenValid) {
    throw new AppError("Invalid refresh token", 401);
  }

  const authPayload = buildAuthPayload(existingUser);
  await storeRefreshToken(existingUser.id, authPayload.refreshToken);

  return authPayload;
};

export const logoutUser = async (userId: string): Promise<void> => {
  await db
    .update(users)
    .set({
      refreshTokenHash: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
};
