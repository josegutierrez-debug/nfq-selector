/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { Users, Clock, Shield, CircleDot } from "lucide-react";

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: string | Date;
}

export interface WaitingRoomProps {
  sessionId: string;
  currentParticipant: Participant | null;
  participants: Participant[];
  onLeave?: () => void;
}

export function WaitingRoom({
  sessionId,
  currentParticipant,
  participants,
  onLeave
}: WaitingRoomProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 text-white selection:bg-zinc-800">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 bg-zinc-800/80 border border-zinc-700/50 px-4 py-2 rounded-full text-zinc-300"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-sm tracking-widest font-bold">SALA: {sessionId}</span>
          </motion.div>
          
          <h1 className="text-3xl font-sans font-bold tracking-tight text-zinc-100">
            Sala de Espera
          </h1>
          <p className="text-zinc-400 text-sm">
            Tus compañeros de juego se están uniendo a la partida.
          </p>
        </div>

        {/* Current User Alias Card */}
        {currentParticipant && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-zinc-800/40 border border-zinc-800 rounded-xl flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs text-zinc-500 font-mono uppercase tracking-wider">Tu Alias Asignado</span>
              <p className="text-xl font-bold text-emerald-400 font-mono tracking-wide">
                {currentParticipant.name}
              </p>
            </div>
            <div className="p-3 bg-zinc-800 rounded-lg text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
          </motion.div>
        )}

        {/* Dynamic Waiting Notice */}
        <div className="flex items-center justify-center gap-3 py-4 border-y border-zinc-800/80">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          >
            <CircleDot className="w-5 h-5 text-emerald-500" />
          </motion.div>
          <motion.p 
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="text-emerald-400 font-mono text-sm uppercase tracking-wider font-semibold"
          >
            Esperando al resto de usuarios...
          </motion.p>
        </div>

        {/* Participants List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase tracking-wider font-medium px-2">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Participantes ({participants.length})
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Lobby Activo
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-zinc-800">
            {participants.map((participant, index) => (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  participant.id === currentParticipant?.id
                    ? "bg-zinc-800/20 border-zinc-800/80"
                    : "bg-zinc-900/60 border-zinc-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    participant.isHost ? "bg-amber-500/10 text-amber-500" : "bg-zinc-800 text-zinc-300"
                  }`}>
                    {participant.name[0]}
                  </div>
                  <div>
                    <span className="font-mono text-sm text-zinc-200 block">
                      {participant.name}
                      {participant.id === currentParticipant?.id && (
                        <span className="ml-2 text-xs text-zinc-500">(Tú)</span>
                      )}
                    </span>
                  </div>
                </div>

                {participant.isHost && (
                  <span className="px-2 py-0.5 text-[10px] uppercase font-mono bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full font-bold">
                    Host
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {onLeave && (
          <div className="pt-2">
            <button
              onClick={onLeave}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-sm font-semibold transition"
            >
              Abandonar Sala
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export default WaitingRoom;
