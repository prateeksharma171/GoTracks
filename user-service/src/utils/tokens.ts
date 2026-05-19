import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export type TokenPayload = {
  userId: string;
  email: string;
};

const signToken = (
  payload: TokenPayload,
  secret: string,
  expiresIn: SignOptions["expiresIn"]
): string => {
  return jwt.sign(payload, secret, { expiresIn });
};

export const generateAccessToken = (payload: TokenPayload): string => {
  return signToken(payload, env.accessTokenSecret, env.accessTokenExpiresIn);
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return signToken(payload, env.refreshTokenSecret, env.refreshTokenExpiresIn);
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.refreshTokenSecret) as TokenPayload;
};
