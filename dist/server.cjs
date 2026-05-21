var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_ws2 = require("ws");
var import_vite = require("vite");

// backend/config/redis.ts
var import_ioredis = require("ioredis");
var redisClient = null;
function getRedisClient() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn(
      "[Redis Config] REDIS_URL environment variable is missing. Operating with standard Memory Store fallback."
    );
    return null;
  }
  if (!redisClient) {
    try {
      const options = {
        // Safe reconnection settings for production scale or network flutter
        maxRetriesPerRequest: 3,
        connectTimeout: 8e3,
        reconnectOnError: (err) => {
          const targetError = "READONLY";
          if (err.message.slice(0, targetError.length) === targetError) {
            return true;
          }
          return false;
        }
      };
      if (redisUrl.startsWith("rediss://")) {
        options.tls = {
          rejectUnauthorized: false
          // Avoid block on self-signed certificates in some private enterprise environments
        };
        console.log("[Redis Config] Secure TLS/SSL connection active (rediss:// detected).");
      }
      redisClient = new import_ioredis.Redis(redisUrl, options);
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

// utils/aliasDictionary.ts
var ADJECTIVES = [
  "Rapido",
  "Astuto",
  "Feroz",
  "Silencioso",
  "Valiente",
  "Noble",
  "Sagaz",
  "Luminoso",
  "Sombrio",
  "Audaz",
  "Alegre",
  "Sereno",
  "Tendido",
  "Agil",
  "Veloz"
];
var ANIMALS = [
  "Lobo",
  "Zorro",
  "Oso",
  "Leon",
  "Tigre",
  "Aguila",
  "Halcon",
  "Delfin",
  "Gato",
  "Perro",
  "Panda",
  "Buho",
  "Coyote",
  "Pantera",
  "Jaguar"
];
function generateBaseAlias() {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  return `${animal}_${adjective}`;
}

// managers/sessionManager.ts
function serializeSession(session) {
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
    isPublic: session.isPublic
  };
  return JSON.stringify(serialized);
}
function deserializeSession(jsonStr) {
  const parsed = JSON.parse(jsonStr);
  const session = {
    id: parsed.id,
    state: parsed.state,
    hostId: parsed.hostId,
    participants: new Map(
      (parsed.participants || []).map(([k, p]) => [
        k,
        {
          ...p,
          joinedAt: new Date(p.joinedAt)
        }
      ])
    ),
    shuffledOrder: parsed.shuffledOrder,
    createdAt: new Date(parsed.createdAt),
    lastActivityAt: parsed.lastActivityAt ? new Date(parsed.lastActivityAt) : void 0,
    includeHostInDraw: parsed.includeHostInDraw !== void 0 ? parsed.includeHostInDraw : true,
    isPublic: parsed.isPublic !== void 0 ? parsed.isPublic : true
  };
  return session;
}
var SessionManager = class _SessionManager {
  constructor() {
    this.sessions = /* @__PURE__ */ new Map();
    // 1 hour session TTL in milliseconds
    this.cleanupInterval = null;
    this.startCleanupInterval();
  }
  static {
    this.SESSION_TTL = 36e5;
  }
  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 12e4);
    if (this.cleanupInterval && typeof this.cleanupInterval.unref === "function") {
      this.cleanupInterval.unref();
    }
  }
  async cleanupExpiredSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      const lastActive = session.lastActivityAt ? session.lastActivityAt.getTime() : session.createdAt.getTime();
      if (now - lastActive > _SessionManager.SESSION_TTL) {
        this.sessions.delete(id);
      }
    }
    const redis = getRedisClient();
    if (redis) {
      try {
        const keys = await redis.keys("room:*");
        for (const key of keys) {
          const val = await redis.get(key);
          if (val) {
            const session = deserializeSession(val);
            const lastActive = session.lastActivityAt ? session.lastActivityAt.getTime() : session.createdAt.getTime();
            if (now - lastActive > _SessionManager.SESSION_TTL) {
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
  static getInstance() {
    if (!_SessionManager.instance) {
      _SessionManager.instance = new _SessionManager();
    }
    return _SessionManager.instance;
  }
  /**
   * Generates a unique, short, human-friendly alphanumeric code (e.g., "7B9X2A")
   */
  async generateUniqueId() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const redis = getRedisClient();
    let attempts = 0;
    while (attempts < 1e3) {
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
  async createSession(hostId) {
    const sessionId = await this.generateUniqueId();
    const baseAlias = generateBaseAlias();
    const session = {
      id: sessionId,
      state: "Lobby",
      hostId,
      participants: /* @__PURE__ */ new Map(),
      createdAt: /* @__PURE__ */ new Date(),
      lastActivityAt: /* @__PURE__ */ new Date(),
      includeHostInDraw: true,
      isPublic: true
    };
    session.participants.set(hostId, {
      id: hostId,
      name: baseAlias,
      isHost: true,
      joinedAt: /* @__PURE__ */ new Date()
    });
    this.sessions.set(sessionId, session);
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
  async getSession(sessionId) {
    const cleanId = sessionId.toUpperCase();
    const redis = getRedisClient();
    if (redis) {
      try {
        const val = await redis.get(`room:${cleanId}`);
        if (val) {
          const session2 = deserializeSession(val);
          session2.lastActivityAt = /* @__PURE__ */ new Date();
          this.sessions.set(cleanId, session2);
          await redis.set(`room:${cleanId}`, serializeSession(session2), "EX", 1800);
          return session2;
        }
      } catch (err) {
        console.error("[SessionManager Redis Get Error]:", err);
      }
    }
    const session = this.sessions.get(cleanId);
    if (session) {
      session.lastActivityAt = /* @__PURE__ */ new Date();
    }
    return session;
  }
  /**
   * Explicitly updates a session model in Redis and local memory stores.
   */
  async saveSession(session) {
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
  async getAllSessions() {
    const redis = getRedisClient();
    if (redis) {
      try {
        const keys = await redis.keys("room:*");
        if (keys.length > 0) {
          const vals = await redis.mget(...keys);
          return vals.filter((v) => !!v).map((v) => deserializeSession(v));
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
  async getActiveLobbies() {
    const all = await this.getAllSessions();
    return all.filter((session) => session.state === "Lobby" && session.isPublic !== false);
  }
  /**
   * Closes and deletes a session
   */
  async deleteSession(sessionId) {
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
  async addParticipant(sessionId, participantId, name, isHost = false) {
    const session = await this.getSession(sessionId);
    if (!session) return false;
    session.participants.set(participantId, {
      id: participantId,
      name,
      isHost,
      joinedAt: /* @__PURE__ */ new Date()
    });
    session.lastActivityAt = /* @__PURE__ */ new Date();
    await this.saveSession(session);
    return true;
  }
  /**
   * Removes a participant from a session
   */
  async removeParticipant(sessionId, participantId) {
    const session = await this.getSession(sessionId);
    if (!session) return false;
    const removed = session.participants.delete(participantId);
    session.lastActivityAt = /* @__PURE__ */ new Date();
    if (participantId === session.hostId || session.participants.size === 0) {
      await this.deleteSession(sessionId);
    } else {
      await this.saveSession(session);
    }
    return removed;
  }
};

// controllers/lobbyController.ts
var LobbyController = class _LobbyController {
  constructor() {
    this.sessionManager = SessionManager.getInstance();
  }
  static getInstance() {
    if (!_LobbyController.instance) {
      _LobbyController.instance = new _LobbyController();
    }
    return _LobbyController.instance;
  }
  /**
   * Generates an alias from the dictionary. If a collision is found in the specified session,
   * it appends an incremental numeric suffix (e.g. "Lobo_Azul_1") until unique.
   */
  generateUniqueAlias(session) {
    const baseAlias = generateBaseAlias();
    const participants = Array.from(session.participants.values());
    const isUsed = (alias) => participants.some((p) => p.name === alias);
    if (!isUsed(baseAlias)) {
      return baseAlias;
    }
    let suffix = 1;
    while (true) {
      const candidateAlias = `${baseAlias}_${suffix}`;
      if (!isUsed(candidateAlias)) {
        return candidateAlias;
      }
      suffix++;
    }
  }
  /**
   * Validates the session ID and registers a client with a unique dictionary alias.
   * Rejects connections if the session ID doesn't exist or is expired due to inactivity (TTL).
   */
  async joinLobby(sessionId, clientId) {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      return { success: false, error: "La sesi\xF3n no existe." };
    }
    const now = Date.now();
    const lastActive = session.lastActivityAt ? session.lastActivityAt.getTime() : session.createdAt.getTime();
    const TTL_LIMIT = 36e5;
    if (now - lastActive > TTL_LIMIT) {
      await this.sessionManager.deleteSession(sessionId);
      return { success: false, error: "La sesi\xF3n ha vencido por inactividad (TTL expirado)." };
    }
    if (session.participants.has(clientId)) {
      return {
        success: true,
        participant: session.participants.get(clientId),
        session
      };
    }
    if (session.state === "Locked" || session.state === "Result_Displayed") {
      return { success: false, error: "La sesi\xF3n est\xE1 bloqueada y no acepta nuevos participantes." };
    }
    const uniqueAlias = this.generateUniqueAlias(session);
    const success = await this.sessionManager.addParticipant(sessionId, clientId, uniqueAlias);
    if (!success) {
      return { success: false, error: "Failed to add participant" };
    }
    const refreshedSession = await this.sessionManager.getSession(sessionId);
    const participant = refreshedSession?.participants.get(clientId);
    return {
      success: true,
      participant,
      session: refreshedSession || session
    };
  }
};

// events/wsDispatcher.ts
var import_ws = require("ws");

// services/randomEngine.ts
var import_crypto = __toESM(require("crypto"), 1);
var RandomEngine = class {
  /**
   * Shuffles an array of strings (e.g., participant IDs) using an improved,
   * cryptographically secure Fisher-Yates algorithm with high-entropy source.
   * This returns a new array, retaining immutability.
   */
  static shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = import_crypto.default.randomInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
};

// events/wsDispatcher.ts
var WSDispatcher = class _WSDispatcher {
  constructor() {
    this.sessionManager = SessionManager.getInstance();
  }
  static getInstance() {
    if (!_WSDispatcher.instance) {
      _WSDispatcher.instance = new _WSDispatcher();
    }
    return _WSDispatcher.instance;
  }
  /**
   * Performs the order shuffling securely and broadcasts state changes.
   * Handles transitioning: Lobby -> Locked -> Result_Displayed.
   */
  async generateAndBroadcastOrder(sessionId, requestingClientId, clients2) {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      return { success: false, error: "La sesi\xF3n no existe." };
    }
    if (session.hostId !== requestingClientId) {
      return { success: false, error: "\xDAnicamente el Host de la sesi\xF3n puede generar el orden de turnos." };
    }
    let participantIds = Array.from(session.participants.keys());
    if (session.includeHostInDraw === false) {
      participantIds = participantIds.filter((id) => id !== session.hostId);
    }
    if (participantIds.length < 2) {
      return {
        success: false,
        error: session.includeHostInDraw === false ? "Se requieren al menos 2 participantes (excluyendo al Host) para poder generar el sorteo." : "Se requieren al menos 2 participantes activos para poder generar el sorteo."
      };
    }
    session.state = "Locked";
    await this.sessionManager.saveSession(session);
    this.broadcastSessionUpdate(session, clients2);
    const shuffledIds = RandomEngine.shuffle(participantIds);
    session.shuffledOrder = shuffledIds;
    session.state = "Result_Displayed";
    await this.sessionManager.saveSession(session);
    this.broadcastSessionUpdate(session, clients2);
    return { success: true };
  }
  /**
   * Broadcasts the synchronized session update, including order if Displayed.
   */
  broadcastSessionUpdate(session, clients2) {
    const participantsList = Array.from(session.participants.values()).map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      joinedAt: p.joinedAt
    }));
    const payload = {
      type: "LOBBY_UPDATE",
      payload: {
        sessionId: session.id,
        state: session.state,
        participants: participantsList,
        shuffledOrder: session.shuffledOrder || null,
        includeHostInDraw: session.includeHostInDraw !== false,
        isPublic: session.isPublic !== false
      }
    };
    const messageStr = JSON.stringify(payload);
    for (const client of clients2) {
      if (client.sessionId === session.id && client.ws.readyState === import_ws.WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    }
  }
};

// server.ts
var import_url = require("url");
var import_path = __toESM(require("path"), 1);
var import_meta = {};
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var app = (0, import_express.default)();
var server = import_http.default.createServer(app);
app.use(import_express.default.json());
var sessionManager = SessionManager.getInstance();
var lobbyController = LobbyController.getInstance();
var wsDispatcher = WSDispatcher.getInstance();
var clients = /* @__PURE__ */ new Set();
async function broadcastSessionUpdate(sessionId) {
  const session = await sessionManager.getSession(sessionId);
  if (!session) return;
  wsDispatcher.broadcastSessionUpdate(session, clients);
}
app.post("/api/sessions", async (req, res) => {
  const hostId = req.body.hostId || `host_${Math.random().toString(36).substring(2, 9)}`;
  const session = await sessionManager.createSession(hostId);
  res.status(201).json({
    sessionId: session.id,
    state: session.state,
    hostId: session.hostId,
    createdAt: session.createdAt.toISOString()
  });
});
app.get("/api/sessions/:id", async (req, res) => {
  const session = await sessionManager.getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json({
    sessionId: session.id,
    state: session.state,
    hostId: session.hostId,
    participants: Array.from(session.participants.entries()).map(([_, p]) => p),
    createdAt: session.createdAt.toISOString()
  });
});
app.get("/api/active-rooms", async (req, res) => {
  const lobbies = await sessionManager.getActiveLobbies();
  const rooms = lobbies.map((session) => ({
    id: session.id,
    state: session.state,
    participantCount: session.participants.size
  }));
  res.json({ rooms });
});
var wss = new import_ws2.WebSocketServer({ noServer: true });
wss.on("connection", (ws) => {
  const connection = {
    ws,
    clientId: `client_${Math.random().toString(36).substring(2, 9)}`,
    sessionId: null
  };
  clients.add(connection);
  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      switch (data.type) {
        case "CREATE_SESSION": {
          const { clientId } = data.payload || {};
          if (clientId) {
            connection.clientId = clientId;
          }
          const session = await sessionManager.createSession(connection.clientId);
          connection.sessionId = session.id;
          const hostParticipant = session.participants.get(connection.clientId);
          const hostName = hostParticipant ? hostParticipant.name : "Host";
          ws.send(JSON.stringify({
            type: "SESSION_CREATED",
            payload: {
              sessionId: session.id,
              state: session.state,
              hostId: session.hostId,
              hostName,
              createdAt: session.createdAt.toISOString(),
              participants: Array.from(session.participants.values()).map((p) => ({
                id: p.id,
                name: p.name,
                isHost: p.isHost,
                joinedAt: p.joinedAt
              })),
              includeHostInDraw: session.includeHostInDraw !== false,
              isPublic: session.isPublic !== false
            }
          }));
          break;
        }
        case "JOIN_SESSION": {
          const { sessionId, clientId } = data.payload || {};
          if (clientId) {
            connection.clientId = clientId;
          }
          if (!sessionId) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: "sessionId is required to join" } }));
            break;
          }
          const result = await lobbyController.joinLobby(sessionId, connection.clientId);
          if (!result.success || !result.participant || !result.session) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: result.error || "Failed to join session" } }));
          } else {
            connection.sessionId = sessionId.toUpperCase();
            ws.send(JSON.stringify({
              type: "SESSION_JOINED",
              payload: {
                sessionId: result.session.id,
                state: result.session.state,
                currentParticipant: {
                  id: result.participant.id,
                  name: result.participant.name,
                  isHost: result.participant.isHost,
                  joinedAt: result.participant.joinedAt
                },
                participants: Array.from(result.session.participants.values()).map((p) => ({
                  id: p.id,
                  name: p.name,
                  isHost: p.isHost,
                  joinedAt: p.joinedAt
                })),
                shuffledOrder: result.session.shuffledOrder || null,
                includeHostInDraw: result.session.includeHostInDraw !== false,
                isPublic: result.session.isPublic !== false
              }
            }));
            await broadcastSessionUpdate(connection.sessionId);
          }
          break;
        }
        case "GENERATE_ORDER": {
          if (!connection.sessionId) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: "No active session associated with this connection" } }));
            break;
          }
          const result = await wsDispatcher.generateAndBroadcastOrder(connection.sessionId, connection.clientId, clients);
          if (!result.success) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: result.error || "Failed to generate order" } }));
          }
          break;
        }
        case "GET_ACTIVE_ROOMS": {
          const lobbies = await sessionManager.getActiveLobbies();
          const rooms = lobbies.map((session) => ({
            id: session.id,
            state: session.state,
            participantCount: session.participants.size
          }));
          ws.send(JSON.stringify({
            type: "ACTIVE_ROOMS_LIST",
            payload: { rooms }
          }));
          break;
        }
        case "UPDATE_SETTINGS": {
          const { includeHostInDraw, isPublic } = data.payload || {};
          if (!connection.sessionId) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: "No tienes una sesi\xF3n activa vinculada a esta conexi\xF3n." } }));
            break;
          }
          const session = await sessionManager.getSession(connection.sessionId);
          if (!session) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: "La sesi\xF3n no existe." } }));
            break;
          }
          if (session.hostId !== connection.clientId) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: "\xDAnicamente el Host de la sesi\xF3n puede cambiar los ajustes." } }));
            break;
          }
          if (includeHostInDraw !== void 0) {
            session.includeHostInDraw = !!includeHostInDraw;
          }
          if (isPublic !== void 0) {
            session.isPublic = !!isPublic;
          }
          session.lastActivityAt = /* @__PURE__ */ new Date();
          await sessionManager.saveSession(session);
          await broadcastSessionUpdate(connection.sessionId);
          break;
        }
        case "UPDATE_ALIAS": {
          const { newName } = data.payload || {};
          if (!connection.sessionId) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: "No tienes una sesi\xF3n activa vinculada a esta conexi\xF3n." } }));
            break;
          }
          if (!newName || typeof newName !== "string" || newName.trim() === "") {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: "El alias no puede estar vac\xEDo." } }));
            break;
          }
          const session = await sessionManager.getSession(connection.sessionId);
          if (!session) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: "La sesi\xF3n no existe." } }));
            break;
          }
          const newNameClean = newName.trim();
          const nameUsed = Array.from(session.participants.values()).some(
            (p) => p.id !== connection.clientId && p.name.toLowerCase() === newNameClean.toLowerCase()
          );
          if (nameUsed) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: `El alias "${newNameClean}" ya est\xE1 en uso por otro participante en esta sala.` } }));
            break;
          }
          const participant = session.participants.get(connection.clientId);
          if (!participant) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: "No eres un participante en esta sesi\xF3n." } }));
            break;
          }
          participant.name = newNameClean;
          session.lastActivityAt = /* @__PURE__ */ new Date();
          await sessionManager.saveSession(session);
          await broadcastSessionUpdate(connection.sessionId);
          break;
        }
        case "LEAVE_SESSION": {
          if (connection.sessionId) {
            await sessionManager.removeParticipant(connection.sessionId, connection.clientId);
            await broadcastSessionUpdate(connection.sessionId);
            connection.sessionId = null;
          }
          break;
        }
        case "PING": {
          ws.send(JSON.stringify({ type: "PONG" }));
          break;
        }
        default:
          ws.send(JSON.stringify({ type: "ERROR", payload: { message: `Unknown message type: ${data.type}` } }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: "ERROR", payload: { message: "Invalid JSON format" } }));
    }
  });
  ws.on("close", () => {
    clients.delete(connection);
  });
});
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});
async function initializeVite() {
  const isProd = process.env.NODE_ENV === "production" || __filename.includes("server.cjs");
  if (!isProd) {
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        allowedHosts: "all"
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    let distPath = import_path.default.join(process.cwd(), "dist");
    if (!import_fs.default.existsSync(import_path.default.join(distPath, "index.html"))) {
      distPath = __dirname;
    }
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
}
process.env.VITE_ALLOWED_HOSTS = "all";
var port = Number(process.env.PORT) || 3e3;
initializeVite().then(() => {
  server.listen(port, "0.0.0.0", () => {
    console.log(`\u{1F680} Servidor en la nube rugiendo en el puerto ${port}`);
  });
}).catch((err) => {
  console.error("\u{1F525} Fallo al inicializar Vite:", err);
});
process.on("uncaughtException", (err) => console.error("\u{1F525} Error cr\xEDtico de Node:", err));
process.on("unhandledRejection", (err) => console.error("\u{1F525} Promesa rechazada:", err));
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
