/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { Users, Shield, Award, RotateCcw, Shuffle, Lock, Sparkles, HelpCircle } from "lucide-react";

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: string | Date;
}

export type SessionState = "Idle" | "Lobby" | "Active" | "Finished" | "Locked" | "Result_Displayed";

export interface ResultsViewProps {
  sessionId: string;
  state: SessionState;
  currentParticipant: Participant | null;
  participants: Participant[];
  shuffledOrder: string[] | null;
  onGenerateOrder: () => void;
  onLeave?: () => void;
}

export function ResultsView({
  sessionId,
  state,
  currentParticipant,
  participants,
  shuffledOrder,
  onGenerateOrder,
  onLeave
}: ResultsViewProps) {
  const isHost = currentParticipant?.isHost || false;
  const canGenerate = participants.length >= 2;

  // Map participants by ID for easy lookup
  const participantMap = new Map<string, Participant>(
    participants.map((p) => [p.id, p])
  );

  // Determine the list of ordered participants
  const orderedParticipants = shuffledOrder
    ? shuffledOrder
        .map((id) => participantMap.get(id))
        .filter((p): p is Participant => !!p)
    : [];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 text-white selection:bg-zinc-800">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-zinc-800/80 border border-zinc-700/50 px-4 py-2 rounded-full text-zinc-300"
          >
            <span className={`w-2.5 h-2.5 rounded-full ${
              state === "Result_Displayed" ? "bg-amber-400" : "bg-emerald-500 animate-pulse"
            }`} />
            <span className="font-mono text-sm tracking-widest font-bold">SALA: {sessionId}</span>
          </motion.div>
          
          <h1 className="text-3xl font-sans font-bold tracking-tight text-zinc-100">
            {state === "Result_Displayed" ? "Orden de Turnos Generado" : "Sala de Espera"}
          </h1>
          <p className="text-zinc-400 text-sm">
            {state === "Result_Displayed"
              ? "El motor de aleatoriedad Fisher-Yates ha secuenciado el orden inmutable."
              : "Esperando a los participantes para barajar un orden de juego aleatorio."}
          </p>
        </div>

        {/* State Notice & Host Controls */}
        <div className="space-y-4">
          {state !== "Result_Displayed" && (
            <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800 flex flex-col items-center text-center space-y-3">
              <div className="flex items-center gap-2 text-zinc-300 text-sm">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>{participants.length} usuarios conectados</span>
              </div>
              
              {isHost ? (
                <div className="w-full pt-1">
                  {canGenerate ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onGenerateOrder}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-950/25 flex items-center justify-center gap-2"
                    >
                      <Shuffle className="w-5 h-5" />
                      Generar orden de turnos
                    </motion.button>
                  ) : (
                    <div className="text-xs text-zinc-500 bg-zinc-950/50 rounded-lg p-3 w-full border border-zinc-900">
                      Necesitas al menos 2 participantes para barajar el orden.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-wider animate-pulse pt-1">
                  <Lock className="w-3.5 h-3.5" />
                  Esperando al resto de usuarios...
                </div>
              )}
            </div>
          )}

          {state === "Locked" && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center text-amber-500 font-mono text-sm animate-pulse">
              Generando secuencia segura. Sala bloqueada...
            </div>
          )}
        </div>

        {/* Current User Card */}
        {currentParticipant && (
          <div className="p-4 bg-zinc-800/40 border border-zinc-800/60 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-500 font-mono uppercase tracking-wider block">Tu Alias Asignado</span>
              <span className="text-lg font-bold text-zinc-100 font-mono">{currentParticipant.name}</span>
            </div>
            {isHost ? (
              <span className="px-2.5 py-1 text-xs font-mono uppercase bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg font-semibold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                Host
              </span>
            ) : (
              <span className="px-2.5 py-1 text-xs font-mono bg-zinc-800 text-zinc-400 rounded-lg font-semibold">
                Jugador
              </span>
            )}
          </div>
        )}

        {/* Shuffled Final Turn Sequence (Displayed) */}
        {state === "Result_Displayed" && (
          <div className="space-y-4">
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Secuencia aleatoria de turnos
            </h3>

            <div className="space-y-2.5">
              {orderedParticipants.map((p, idx) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    idx === 0
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                      : "bg-zinc-900/40 border-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`w-7 h-7 flex items-center justify-center font-mono rounded-lg text-sm font-bold ${
                      idx === 0 ? "bg-amber-400 text-zinc-950 font-black" : "bg-zinc-800 text-zinc-400"
                    }`}>
                      {idx + 1}
                    </span>
                    <span className={`font-mono ${idx === 0 ? "font-bold text-amber-400" : "text-zinc-200"}`}>
                      {p.name}
                      {p.id === currentParticipant?.id && (
                        <span className="ml-2 text-xs text-zinc-500 font-normal select-none">(Tú)</span>
                      )}
                    </span>
                  </div>
                  {idx === 0 && (
                    <span className="flex items-center gap-1 text-xs font-mono text-amber-400 uppercase font-black tracking-wider animate-pulse">
                      <Award className="w-4 h-4" />
                      Primer Turno
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Secondary Standard Participants List (Not Result State) */}
        {state !== "Result_Displayed" && (
          <div className="space-y-3">
            <div className="font-mono text-xs tracking-wider text-zinc-500 uppercase px-1">
              Participantes Conectados ({participants.length})
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-zinc-900/60 border border-zinc-800/40 rounded-xl flex items-center justify-between"
                >
                  <span className="font-mono text-sm text-zinc-300">
                    {p.name}
                    {p.id === currentParticipant?.id && (
                      <span className="ml-2 text-xs text-zinc-500">(Tú)</span>
                    )}
                  </span>
                  {p.isHost && (
                    <span className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded font-mono uppercase font-semibold">
                      Host
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leave Actions */}
        {onLeave && (
          <div className="pt-2">
            <button
              onClick={onLeave}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl text-sm font-semibold transition font-mono uppercase"
            >
              Salir del Lobby
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export default ResultsView;
