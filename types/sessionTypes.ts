/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SessionState = "Idle" | "Lobby" | "Active" | "Finished" | "Locked" | "Result_Displayed";

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: Date;
}

export interface Session {
  id: string; // Global unique alphanumeric identifier
  state: SessionState;
  hostId: string;
  participants: Map<string, Participant>;
  shuffledOrder?: string[]; // Immutable shuffled list of participant IDs
  createdAt: Date;
  lastActivityAt?: Date; // To prevent memory leaks via TTL checks
  includeHostInDraw?: boolean; // Decidir si el host participa en ser clasificado
  isPublic?: boolean; // Decidir si la sala es pública o secreta
}

export interface CreateSessionResponse {
  sessionId: string;
  state: SessionState;
  hostId: string;
  createdAt: string;
}

export interface SessionErrorResponse {
  error: string;
}
