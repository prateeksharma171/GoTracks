import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";
import {
  loginUser,
  logoutUser,
  refreshUserToken,
  signupUser,
} from "../services/authService.js";
import { verifyRefreshToken } from "../utils/tokens.js";

const setRefreshTokenCookie = (res: Response, refreshToken: string): void => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: env.nodeEnv === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
};

export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      throw new AppError("name, email, and password are required", 400);
    }

    const authPayload = await signupUser({ name, email, password });
    setRefreshTokenCookie(res, authPayload.refreshToken);

    res.status(201).json({
      message: "Signup successful",
      ...authPayload,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    const authPayload = await loginUser({ email, password });
    setRefreshTokenCookie(res, authPayload.refreshToken);

    res.status(200).json({
      message: "Login successful",
      ...authPayload,
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tokenFromCookie = req.cookies.refreshToken as string | undefined;
    const tokenFromBody = (req.body as { refreshToken?: string }).refreshToken;
    const refreshTokenValue = tokenFromCookie ?? tokenFromBody;

    if (!refreshTokenValue) {
      throw new AppError("Refresh token is required", 400);
    }

    const authPayload = await refreshUserToken(refreshTokenValue);
    setRefreshTokenCookie(res, authPayload.refreshToken);

    res.status(200).json({
      message: "Token refreshed successfully",
      ...authPayload,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const refreshTokenValue = req.cookies.refreshToken as string | undefined;

    if (refreshTokenValue) {
      const decodedToken = verifyRefreshToken(refreshTokenValue);
      await logoutUser(decodedToken.userId);
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "strict",
      secure: env.nodeEnv === "production",
    });

    res.status(200).json({
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};
