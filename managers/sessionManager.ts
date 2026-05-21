/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getRedisClient } from "../backend/config/redis";
import { Session, SessionState, Participant } from "../types/sessionTypes";
import { generateBaseAlias } from "../utils/aliasDictionary";

// Utility to serialize custom datatypes (including conversion of Maps)
function serializeSession(session: Session): string {
  const serialized = {
    id: session.id,
    state: session.state,
    hostId: session.hostId,
    participants: Array.from(session.participants.entries()).map(([k, p]) => [
      k,
      { ...p, joinedAt: p.joinedAt instanceof Date ? p.joinedAt.toISOString() : p.joinedAt }
    ]),
    shuffledOrder: session.shuffledOrder,
    createdAt: session.createdAt instanceof Date ? session.createdAt.toISOString() : session.createdAt,
    lastActivityAt: session.lastActivityAt instanceof Date ? session.lastActivityAt.toISOString() : session.lastActivityAt,
    includeHostInDraw: session.includeHostInDraw,
    isPublic: session.isPublic,
  };
  return JSON.stringify(serialized);
}

// Utility to recreate hydrated Session structure with original Maps
function deserializeSession(jsonStr: string): Session {
  const parsed = JSON.parse(jsonStr);
  const session: Session = {
    id: parsed.id,
    state: parsed.state,
    hostId: parsed.hostId,
    participants: new Map<string, Participant>(
      (parsed.participants || []).map(([k, p]: [string, any]) => [
        k,
        {
          ...p,
          joinedAt: new Date(p.joinedAt)
        }
      ])
    ),
    shuffledOrder: parsed.shuffledOrder,
    createdAt: new Date(parsed.createdAt),
    lastActivityAt: parsed.lastActivityAt ? new Date(parsed.lastActivityAt) : undefined,
    includeHostInDraw: parsed.includeHostInDraw !== undefined ? parsed.includeHostInDraw : true,
    isPublic: parsed.isPublic !== undefined ? parsed.isPublic : true,
  };
  return session;
}

export class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, Session> = new Map();
  private static readonly SESSION_TTL = 3600000; // 1 hour session TTL in milliseconds
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startCleanupInterval();
  }

  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 120000); // Check every 2 minutes
    
    // Make sure Node can exit safely if needed
    if (this.cleanupInterval && typeof this.cleanupInterval.unref === "function") {
      this.cleanupInterval.unref();
    }
  }

  private async cleanupExpiredSessions() {
    const now = Date.now();
    
    // Prune stale objects from local memory cache
    for (const [id, session] of this.sessions.entries()) {
      const lastActive = session.lastActivityAt ? session.lastActivityAt.getTime() : session.createdAt.getTime();
      if (now - lastActive > SessionManager.SESSION_TTL) {
        this.sessions.delete(id);
      }
    }

    // Prune stale objects in Remote Redis Service (if connected)
    const redis = getRedisClient();
    if (redis) {
      try {
        const keys = await redis.keys("room:*");
        for (const key of keys) {
          const val = await redis.get(key);
          if (val) {
            const session = deserializeSession(val);
            const lastActive = session.lastActivityAt ? session.lastActivityAt.getTime() : session.createdAt.getTime();
            if (now - lastActive > SessionManager.SESSION_TTL) {
              await redis.del(key);
              console.log(`[SessionManager TTL] Inactive session ${session.id} cleared from Redis.`);
            }
          }
        }
      } catch (err) {
        console.error("[SessionManager TTL] Failed scanning Redis sessions for expiration:", err);
      }
    }
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Generates a unique, short, human-friendly alphanumeric code (e.g., "7B9X2A")
   */
  private async generateUniqueId(): Promise<string> {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const redis = getRedisClient();
    let attempts = 0;
    while (attempts < 1000) {
      let id = "";
      for (let i = 0; i < 6; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      let exists = this.sessions.has(id);
      if (!exists && redis) {
        const hasKey = await redis.exists(`room:${id}`);
        exists = hasKey === 1;
      }

      if (!exists) {
        return id;
      }
      attempts++;
    }
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Creates a new session in "Lobby" state (initial idle/lobby state)
   */
  public async createSession(hostId: string): Promise<Session> {
    const sessionId = await this.generateUniqueId();
    const baseAlias = generateBaseAlias();
    const session: Session = {
      id: sessionId,
      state: "Lobby",
      hostId,
      participants: new Map<string, Participant>(),
      createdAt: new Date(),
      lastActivityAt: new Date(),
      includeHostInDraw: true,
      isPublic: true,
    };

    session.participants.set(hostId, {
      id: hostId,
      name: baseAlias,
      isHost: true,
      joinedAt: new Date(),
    });

    this.sessions.set(sessionId, session);

    // Save to sync Redis engine
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.set(`room:${sessionId.toUpperCase()}`, serializeSession(session), "EX", 1800);
      } catch (err) {
        console.error("[SessionManager Redis Set Error]:", err);
      }
    }

    return session;
  }

  /**
   * Retrieves an active session by ID and refreshes activity
   */
  public async getSession(sessionId: string): Promise<Session | undefined> {
    const cleanId = sessionId.toUpperCase();
    
    // Check Redis first to align multiple dynamic container instances
    const redis = getRedisClient();
    if (redis) {
      try {
        const val = await redis.get(`room:${cleanId}`);
        if (val) {
          const session = deserializeSession(val);
          session.lastActivityAt = new Date();
          // Write-through local cache update
          this.sessions.set(cleanId, session);
          await redis.set(`room:${cleanId}`, serializeSession(session), "EX", 1800);
          return session;
        }
      } catch (err) {
        console.error("[SessionManager Redis Get Error]:", err);
      }
    }

    const session = this.sessions.get(cleanId);
    if (session) {
      session.lastActivityAt = new Date();
    }
    return session;
  }

  /**
   * Explicitly updates a session model in Redis and local memory stores.
   */
  public async saveSession(session: Session): Promise<void> {
    const cleanId = session.id.toUpperCase();
    this.sessions.set(cleanId, session);

    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.set(`room:${cleanId}`, serializeSession(session), "EX", 1800);
      } catch (err) {
        console.error("[SessionManager Redis Save Error]:", err);
      }
    }
  }

  /**
   * Lists all sessions (mainly for administration or debugging)
   */
  public async getAllSessions(): Promise<Session[]> {
    const redis = getRedisClient();
    if (redis) {
      try {
        const keys = await redis.keys("room:*");
        if (keys.length > 0) {
          const vals = await redis.mget(...keys);
          return vals
            .filter((v): v is string => !!v)
            .map(v => deserializeSession(v));
        }
      } catch (err) {
        console.error("[SessionManager Redis GetAll Error]:", err);
      }
    }
    return Array.from(this.sessions.values());
  }

  /**
   * Retrieves all active sessions currently in the "Lobby" state.
   */
  public async getActiveLobbies(): Promise<Session[]> {
    const all = await this.getAllSessions();
    return all.filter((session) => session.state === "Lobby" && session.isPublic !== false);
  }

  /**
   * Closes and deletes a session
   */
  public async deleteSession(sessionId: string): Promise<boolean> {
    const cleanId = sessionId.toUpperCase();
    const deletedLocal = this.sessions.delete(cleanId);
    
    const redis = getRedisClient();
    if (redis) {
      try {
        const deletedRedis = await redis.del(`room:${cleanId}`);
        return deletedRedis > 0 || deletedLocal;
      } catch (err) {
        console.error("[SessionManager Redis Delete Error]:", err);
      }
    }
    return deletedLocal;
  }

  /**
   * Adds a participant to a session
   */
  public async addParticipant(sessionId: string, participantId: string, name: string, isHost: boolean = false): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) return false;

    session.participants.set(participantId, {
      id: participantId,
      name,
      isHost,
      joinedAt: new Date(),
    });
    session.lastActivityAt = new Date();
    
    await this.saveSession(session);
    return true;
  }

  /**
   * Removes a participant from a session
   */
  public async removeParticipant(sessionId: string, participantId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) return false;

    const removed = session.participants.delete(participantId);
    session.lastActivityAt = new Date();
    
    if (participantId === session.hostId || session.participants.size === 0) {
      await this.deleteSession(sessionId);
    } else {
      await this.saveSession(session);
    }
    
    return removed;
  }
}
