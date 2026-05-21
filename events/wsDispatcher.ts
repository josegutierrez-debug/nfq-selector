/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WebSocket } from "ws";
import { SessionManager } from "../managers/sessionManager";
import { RandomEngine } from "../services/randomEngine";
import { Session } from "../types/sessionTypes";

export interface ClientConnection {
  ws: WebSocket;
  clientId: string;
  sessionId: string | null;
}

export class WSDispatcher {
  private static instance: WSDispatcher;
  private sessionManager = SessionManager.getInstance();

  private constructor() {}

  public static getInstance(): WSDispatcher {
    if (!WSDispatcher.instance) {
      WSDispatcher.instance = new WSDispatcher();
    }
    return WSDispatcher.instance;
  }

  /**
   * Performs the order shuffling securely and broadcasts state changes.
   * Handles transitioning: Lobby -> Locked -> Result_Displayed.
   */
  public async generateAndBroadcastOrder(
    sessionId: string,
    requestingClientId: string,
    clients: Set<ClientConnection>
  ): Promise<{ success: boolean; error?: string }> {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      return { success: false, error: "La sesión no existe." };
    }

    // Security check: Only host can invoke
    if (session.hostId !== requestingClientId) {
      return { success: false, error: "Únicamente el Host de la sesión puede generar el orden de turnos." };
    }

    // 1. Determine which participant IDs will be shuffled
    let participantIds = Array.from(session.participants.keys());
    if (session.includeHostInDraw === false) {
      participantIds = participantIds.filter(id => id !== session.hostId);
    }

    // Host restriction based on number of active candidates to shuffle
    if (participantIds.length < 2) {
      return { 
        success: false, 
        error: session.includeHostInDraw === false
          ? "Se requieren al menos 2 participantes (excluyendo al Host) para poder generar el sorteo."
          : "Se requieren al menos 2 participantes activos para poder generar el sorteo." 
      };
    }

    // 2. Transition to Locked to block any new active entrants
    session.state = "Locked";
    await this.sessionManager.saveSession(session);
    this.broadcastSessionUpdate(session, clients);

    // 3. Perform cryptographically secure Fisher-Yates shuffle
    const shuffledIds = RandomEngine.shuffle(participantIds);

    // 4. Cache the order in memory securely and transition to Result_Displayed
    session.shuffledOrder = shuffledIds;
    session.state = "Result_Displayed";
    await this.sessionManager.saveSession(session);

    // 5. Dispatch the final results state simultaneously to all subscribed clients
    this.broadcastSessionUpdate(session, clients);

    return { success: true };
  }

  /**
   * Broadcasts the synchronized session update, including order if Displayed.
   */
  public broadcastSessionUpdate(session: Session, clients: Set<ClientConnection>) {
    const participantsList = Array.from(session.participants.values()).map(p => ({
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
    for (const client of clients) {
      if (client.sessionId === session.id && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    }
  }
}
