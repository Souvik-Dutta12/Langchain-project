import { Redis }from "ioredis";
import type { Redis as RedisClient } from "ioredis";
import { env } from "./env.js";

export const redis = new Redis(env.REDIS_URL,{
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("error", (err:Error) => {
  console.error("Redis error:", err);
});