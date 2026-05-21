/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Redis, RedisOptions } from "ioredis";

/**
 * Backend Redis Client Configuration System
 * 
 * Configures Redis to adapt dynamically to secure production environments (such as cloud database providers).
 * Ensures TLS/SSL (rediss://) settings are configured on detection, and prevents system crash
 * via eager connection if host variables are missing.
 */

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn(
      "[Redis Config] REDIS_URL environment variable is missing. Operating with standard Memory Store fallback."
    );
    return null;
  }

  if (!redisClient) {
    try {
      const options: RedisOptions = {
        // Safe reconnection settings for production scale or network flutter
        maxRetriesPerRequest: 3,
        connectTimeout: 8000,
        reconnectOnError: (err) => {
          const targetError = "READONLY";
          if (err.message.slice(0, targetError.length) === targetError) {
            return true;
          }
          return false;
        }
      };

      // Enable SSL/TLS encryption layer if connecting to rediss:// endpoint
      if (redisUrl.startsWith("rediss://")) {
        options.tls = {
          rejectUnauthorized: false // Avoid block on self-signed certificates in some private enterprise environments
        };
        console.log("[Redis Config] Secure TLS/SSL connection active (rediss:// detected).");
      }

      redisClient = new Redis(redisUrl, options);

      redisClient.on("connect", () => {
        console.log("[Redis Config] Connected to Redis server successfully.");
      });

      redisClient.on("error", (err) => {
        console.error("[Redis Config] Redis cluster error encountered:", err.message);
      });

    } catch (error) {
      console.error("[Redis Config] Failed to initiate Redis Client instantiation:", error);
      redisClient = null;
    }
  }

  return redisClient;
}

export default getRedisClient;
