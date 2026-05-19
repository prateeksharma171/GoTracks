import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, type SelectUser } from "../db/schema/users.js";
import { AppError } from "../utils/AppError.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from "../utils/tokens.js";

type SignupInput = {
  name: string;
  email: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

const buildAuthPayload = (user: SelectUser): AuthPayload => {
  const tokenPayload = {
    userId: user.id,
    email: user.email
  };

  return {
    accessToken: generateAccessToken(tokenPayload),
    refreshToken: generateRefreshToken(tokenPayload),
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  };
};

const storeRefreshToken = async (userId: string, refreshToken: string): Promise<void> => {
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  await db
    .update(users)
    .set({
      refreshTokenHash,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));
};

export const signupUser = async ({ name, email, password }: SignupInput): Promise<AuthPayload> => {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email)
  });

  if (existingUser) {
    throw new AppError("User already exists with this email", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [createdUser] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash
    })
    .returning();

  const authPayload = buildAuthPayload(createdUser);
  await storeRefreshToken(createdUser.id, authPayload.refreshToken);

  return authPayload;
};

export const loginUser = async ({ email, password }: LoginInput): Promise<AuthPayload> => {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email)
  });

  if (!existingUser) {
    throw new AppError("Invalid email or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, existingUser.passwordHash);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const authPayload = buildAuthPayload(existingUser);
  await storeRefreshToken(existingUser.id, authPayload.refreshToken);

  return authPayload;
};

export const refreshUserToken = async (refreshToken: string): Promise<AuthPayload> => {
  const decodedToken = verifyRefreshToken(refreshToken);

  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, decodedToken.userId)
  });

  if (!existingUser || !existingUser.refreshTokenHash) {
    throw new AppError("Invalid refresh token", 401);
  }

  const isRefreshTokenValid = await bcrypt.compare(refreshToken, existingUser.refreshTokenHash);

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
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));
};
