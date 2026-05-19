import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError("Route not found", 404));
};

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isCorsError = error.message.startsWith("CORS blocked for origin:");
  const isJwtError =
    error.name === "JsonWebTokenError" ||
    error.name === "TokenExpiredError" ||
    error.name === "NotBeforeError";
  const statusCode = error instanceof AppError ? error.statusCode : isCorsError ? 403 : isJwtError ? 401 : 500;

  logger.error(error.message, error);

  res.status(statusCode).json({
    message: error.message || "Internal server error"
  });
};
