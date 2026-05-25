import { Router } from "express";
import {
  login,
  logout,
  refreshToken,
  regenerateOtp,
  signup,
  verifyOtp
} from "../controllers/authController.js";

export const authRoute = Router();

authRoute.post("/signup", signup);
authRoute.post("/verify-otp", verifyOtp);
authRoute.post("/regenerate-otp", regenerateOtp);
authRoute.post("/login", login);
authRoute.post("/refresh", refreshToken);
authRoute.post("/logout", logout);
