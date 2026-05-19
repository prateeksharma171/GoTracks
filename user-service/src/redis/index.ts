import { createClient } from "redis";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

class RedisSingleton {
  private static client = createClient({
    username: env.redisUsername,
    password:  env.redisPassword,
    socket: {
        host: env.redisHost,
        port: Number(env.redisPort)
    }
});

  private static connectionPromise: Promise<void> | null = null;

  private static isInitialized = false;

  private static initializeClient(): void {
    if (this.isInitialized) {
      return;
    }

    this.client.on("error", (error) => {
      logger.error("Redis client error", error);
    });

    this.isInitialized = true;
  }

  static getClient() {
    this.initializeClient();
    return this.client;
  }

  static async connect(): Promise<void> {
    const client = this.getClient();

    if (client.isOpen) {
      return;
    }

    if (!this.connectionPromise) {
      this.connectionPromise = client
        .connect()
        .then(() => undefined)
        .finally(() => {
          this.connectionPromise = null;
        });
    }

    await this.connectionPromise;
  }
}

export const getRedisClient = () => RedisSingleton.getClient();

export const connectRedis = async (): Promise<void> => {
  await RedisSingleton.connect();
};

export const checkRedisConnection = async (): Promise<void> => {
  const client = getRedisClient();
  await connectRedis();
  await client.ping();
};
