import { Router } from "express";
import { login, logout, refreshToken, signup } from "../controllers/authController.js";

export const authRoute = Router();

authRoute.post("/signup", signup);
authRoute.post("/login", login);
authRoute.post("/refresh", refreshToken);
authRoute.post("/logout", logout);
