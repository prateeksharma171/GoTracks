import cors from "cors";
import { env } from "../config/env.js";

const allowedHeaders = [
  "Origin",
  "X-Requested-With",
  "Content-Type",
  "Accept",
  "Authorization",
];

export const corsMiddleware = cors({
  origin: env.allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders,
});
