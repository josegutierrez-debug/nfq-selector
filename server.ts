/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { SessionManager } from "./managers/sessionManager";
import { LobbyController } from "./controllers/lobbyController";
import { WSDispatcher, ClientConnection } from "./events/wsDispatcher";

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Middleware for JSON parsing
app.use(express.json());

const sessionManager = SessionManager.getInstance();
const lobbyController = LobbyController.getInstance();
const wsDispatcher = WSDispatcher.getInstance();

const clients = new Set<ClientConnection>();

// Utility function to broadcast session updates to all participants of a session
async function broadcastSessionUpdate(sessionId: string) {
  const session = await sessionManager.getSession(sessionId);
  if (!session) return;
  wsDispatcher.broadcastSessionUpdate(session, clients);
}

// HTTP REST API Endpoint: Create a Session
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

// HTTP REST API Endpoint: Get Session details
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

// HTTP REST API Endpoint: Get all active lobbies (rooms with state === "Lobby")
app.get("/api/active-rooms", async (req, res) => {
  const lobbies = await sessionManager.getActiveLobbies();
  const rooms = lobbies.map((session) => ({
    id: session.id,
    state: session.state,
    participantCount: session.participants.size,
  }));
  res.json({ rooms });
});

// Initialize WebSocket Server
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket client connections
wss.on("connection", (ws: WebSocket) => {
  const connection: ClientConnection = {
    ws,
    clientId: `client_${Math.random().toString(36).substring(2, 9)}`,
    sessionId: null
  };
  clients.add(connection);

  ws.on("message", async (message: string) => {
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
              participants: Array.from(session.participants.values()).map(p => ({
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
            
            // Acknowledge the joining client
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
                participants: Array.from(result.session.participants.values()).map(p => ({
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

            // Notify all clients in the lobby about the updated participant list
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
          const rooms = lobbies.map(session => ({
            id: session.id,
            state: session.state,
            participantCount: session.participants.size,
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
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: "No tienes una sesión activa vinculada a esta conexión." } }));
            break;
          }
          const session = await sessionManager.getSession(connection.sessionId);
          if (!session) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: "La sesión no existe." } }));
            break;
          }
          if (session.hostId !== connection.clientId) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: "Únicamente el Host de la sesión puede cambiar los ajustes." } }));
            break;
          }
          if (includeHostInDraw !== undefined) {
            session.includeHostInDraw = !!includeHostInDraw;
          }
          if (isPublic !== undefined) {
            session.isPublic = !!isPublic;
          }
          session.lastActivityAt = new Date();
          await sessionManager.saveSession(session);

          // Broadcast structural updates to everyone in the room
          await broadcastSessionUpdate(connection.sessionId);
          break;
        }

        case "UPDATE_ALIAS": {
          const { newName } = data.payload || {};
          if (!connection.sessionId) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: "No tienes una sesión activa vinculada a esta conexión." } }));
            break;
          }
          if (!newName || typeof newName !== "string" || newName.trim() === "") {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: "El alias no puede estar vacío." } }));
            break;
          }

          const session = await sessionManager.getSession(connection.sessionId);
          if (!session) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: "La sesión no existe." } }));
            break;
          }

          const newNameClean = newName.trim();

          // Prevent alias collisions strictly
          const nameUsed = Array.from(session.participants.values()).some(
            (p) => p.id !== connection.clientId && p.name.toLowerCase() === newNameClean.toLowerCase()
          );

          if (nameUsed) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: `El alias "${newNameClean}" ya está en uso por otro participante en esta sala.` } }));
            break;
          }

          const participant = session.participants.get(connection.clientId);
          if (!participant) {
            ws.send(JSON.stringify({ type: "ERROR", payload: { message: "No eres un participante en esta sesión." } }));
            break;
          }

          participant.name = newNameClean;
          session.lastActivityAt = new Date();
          await sessionManager.saveSession(session);

          // Broadcast structural updates to everyone in the room
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

// Attach WS upgrade to the HTTP server
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// Integrate Vite Middleware
async function initializeVite() {
  const isProd = process.env.NODE_ENV === "production" || __filename.includes("server.cjs");
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    let distPath = path.join(process.cwd(), "dist");
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      distPath = __dirname;
    }
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

initializeVite().then(() => {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to initialize Vite", err);
});
