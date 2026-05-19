import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { checkDatabaseConnection } from "./db/index.js";
import { corsMiddleware } from "./middlewares/corsMiddleware.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { checkRedisConnection } from "./redis/index.js";
import { authRoute } from "./routes/authRoute.js";
import { logger } from "./utils/logger.js";

const app = express();
const requestLogFormat =
  "type: :url | method: :method | status: :status | request-time: :response-time ms";

app.use(helmet());
app.use(
  morgan(requestLogFormat, {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      }
    }
  })
);
app.use(corsMiddleware);
app.use(express.json());
app.use(cookieParser(env.cookieSecret));

app.get("/", (_req, res) => {
  res.status(200).json({
    message: "Hello from user-service",
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    message: "OK",
  });
});

app.use(`/api/${env.apiVersion}/auth`, authRoute);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    await checkDatabaseConnection();
    logger.info("Database connected successfully");
    await checkRedisConnection();
    logger.info("Redis connected successfully");

    app.listen(env.port, () => {
      logger.info(
        `${env.serviceName} is running on http://localhost:${env.port}`,
      );
    });
  } catch (error) {
    logger.error("Error starting server:", error);
    process.exit(1);
  }
};

startServer();
