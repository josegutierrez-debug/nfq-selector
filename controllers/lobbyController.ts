/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SessionManager } from "../managers/sessionManager";
import { generateBaseAlias } from "../utils/aliasDictionary";
import { Participant, Session } from "../types/sessionTypes";

export class LobbyController {
  private static instance: LobbyController;
  private sessionManager = SessionManager.getInstance();

  private constructor() {}

  public static getInstance(): LobbyController {
    if (!LobbyController.instance) {
      LobbyController.instance = new LobbyController();
    }
    return LobbyController.instance;
  }

  /**
   * Generates an alias from the dictionary. If a collision is found in the specified session,
   * it appends an incremental numeric suffix (e.g. "Lobo_Azul_1") until unique.
   */
  public generateUniqueAlias(session: Session): string {
    const baseAlias = generateBaseAlias();
    
    // Check if the base alias is already in use
    const participants = Array.from(session.participants.values());
    const isUsed = (alias: string) => participants.some(p => p.name === alias);

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
  public async joinLobby(sessionId: string, clientId: string): Promise<{ success: boolean; participant?: Participant; error?: string; session?: Session }> {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      return { success: false, error: "La sesión no existe." };
    }

    // Explicitly validate TTL / activity limits
    const now = Date.now();
    const lastActive = session.lastActivityAt ? session.lastActivityAt.getTime() : session.createdAt.getTime();
    const TTL_LIMIT = 3600000; // 1 hour session lifetime
    if (now - lastActive > TTL_LIMIT) {
      await this.sessionManager.deleteSession(sessionId);
      return { success: false, error: "La sesión ha vencido por inactividad (TTL expirado)." };
    }

    // If participant already exists (reconnection), return them directly to preserve identity
    if (session.participants.has(clientId)) {
      return {
        success: true,
        participant: session.participants.get(clientId),
        session
      };
    }

    // If new participant tries to join but state is Locked or Result_Displayed, prevent entry
    if (session.state === "Locked" || session.state === "Result_Displayed") {
      return { success: false, error: "La sesión está bloqueada y no acepta nuevos participantes." };
    }

    // Generate unique dictionary alias
    const uniqueAlias = this.generateUniqueAlias(session);

    // Register participant in the session
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
}
