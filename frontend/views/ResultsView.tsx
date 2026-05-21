/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Award, Star, Share2, Clipboard, Check, LogOut, Loader2, Play, Shuffle } from "lucide-react";

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
  onLeave?: () => void;
  onReorder?: () => void;
}

export function ResultsView({
  sessionId,
  state,
  currentParticipant,
  participants,
  shuffledOrder,
  onLeave,
  onReorder
}: ResultsViewProps) {
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [mockShuffleAlias, setMockShuffleAlias] = useState<string>("Barajando...");

  // Match participants by ID
  const participantMap = new Map<string, Participant>(
    participants.map((p) => [p.id, p])
  );

  // Shuffled participant names ordered
  const orderedParticipants = shuffledOrder
    ? shuffledOrder
        .map((id) => participantMap.get(id))
        .filter((p): p is Participant => !!p)
    : [];

  // 3-second animated countdown / shuffle when state becomes "Locked" or contains results
  useEffect(() => {
    if (state === "Locked" || state === "Result_Displayed") {
      setCountdown(3);
      setShowResults(false);
      
      // Fast list-shuffling animation in text
      const namePool = participants.map(p => p.name);
      const interval = setInterval(() => {
        if (namePool.length > 0) {
          const randIdx = Math.floor(Math.random() * namePool.length);
          setMockShuffleAlias(namePool[randIdx]);
        }
      }, 150);

      return () => clearInterval(interval);
    }
  }, [state, participants.length]);

  // Handle countdown numeric ticking down
  useEffect(() => {
    if (countdown !== null) {
      if (countdown > 0) {
        const timer = setTimeout(() => {
          setCountdown(countdown - 1);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        setShowResults(true);
        setCountdown(null);
      }
    }
  }, [countdown]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sessionId.toUpperCase());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-8 overflow-hidden relative">
      
      {/* Decorative top background blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* RENDER STAGE 1: Countdown Screen (active during countdown & Locked state) */}
      <AnimatePresence mode="wait">
        {countdown !== null && !showResults ? (
          <motion.div
            key="countdown-stage"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="py-12 flex flex-col items-center justify-center text-center space-y-6"
          >
            {/* Spinning/pulsating container */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                className="absolute inset-0 rounded-full border-4 border-dashed border-emerald-500/20 border-t-emerald-500"
              />
              
              <motion.div
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-mono text-5xl font-black text-emerald-400 z-10"
              >
                {countdown}
              </motion.div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-semibold">
                Algoritmo Fisher-Yates Activo
              </span>
              <h2 className="text-xl font-bold text-zinc-100">
                Barajando Posiciones...
              </h2>
              <p className="text-xs text-zinc-550 font-mono italic max-w-xs mx-auto">
                {mockShuffleAlias}
              </p>
            </div>
          </motion.div>
        ) : (
          /* RENDER STAGE 2: Finished Results Sequence Grid */
          <motion.div
            key="results-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 relative"
          >
            {/* Subheader */}
            <div className="text-center space-y-2">
              <div className="flex justify-center gap-1 bg-zinc-950 border border-zinc-800/80 p-1 rounded-xl w-fit mx-auto select-none">
                <span className="font-mono text-xs font-semibold px-3 py-1 text-zinc-400">
                  SALA: {sessionId.toUpperCase()}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="p-1 px-2 text-zinc-500 hover:text-emerald-400 transition text-[10px] font-mono border-l border-zinc-900 hover:bg-zinc-900 rounded-r-lg flex items-center gap-1 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      COPIADO
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3 h-3" />
                      COPIAR
                    </>
                  )}
                </button>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-zinc-150 flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                Turnos Ordenados
              </h2>
              <p className="text-zinc-500 text-xs font-mono max-w-xs mx-auto">
                La lista ha sido estructurada de forma segura e inmutable.
              </p>
            </div>

            {/* Structured Card Grid list */}
            <div className="space-y-3 pt-2">
              {orderedParticipants.map((participant, index) => {
                const isFirst = index === 0;
                const isMe = participant.id === currentParticipant?.id;

                return (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    className={`relative p-5 rounded-2xl border transition-all ${
                      isFirst
                        ? "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30 text-amber-200 shadow-lg shadow-amber-950/10"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-300"
                    }`}
                  >
                    {/* Position Badge badge */}
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {isFirst && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase bg-amber-450 text-zinc-950 font-black tracking-wider animate-scale select-none shadow-sm shadow-amber-400/20">
                          <Star className="w-3 h-3 fill-zinc-950" />
                          Primero
                        </span>
                      )}
                      
                      <span className={`w-10 h-10 flex items-center justify-center font-mono rounded-xl text-lg font-black ${
                        isFirst
                          ? "bg-amber-400 text-zinc-950 border border-amber-300 shadow-inner"
                          : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                      }`}>
                        #{index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-sans font-black text-sm select-none ${
                        isFirst 
                          ? "bg-amber-400/20 text-amber-400" 
                          : "bg-zinc-800 text-zinc-400"
                      }`}>
                        {participant.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="space-y-0.5">
                        <span className={`font-mono block tracking-wide ${isFirst ? "font-bold text-amber-300" : "text-zinc-150"}`}>
                          {participant.name}
                          {isMe && (
                            <span className="ml-2 py-0.5 px-1.5 rounded bg-zinc-800 text-[10px] text-zinc-500 font-normal">
                              Tú
                            </span>
                          )}
                        </span>
                        
                        <span className="text-[10px] text-zinc-650 font-mono flex items-center gap-1 uppercase select-none font-medium">
                          {participant.isHost ? "Host de la Sesión" : "Participante"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Secondary footer / action */}
            <div className="space-y-3 pt-4 border-t border-zinc-800/80">
              {currentParticipant?.isHost && onReorder && (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={onReorder}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 font-black tracking-wide rounded-xl transition shadow-lg flex items-center justify-center gap-2.5 cursor-pointer font-sans text-sm"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Volver a sortear turnos</span>
                </motion.button>
              )}

              {onLeave && (
                <button
                  onClick={onLeave}
                  className="w-full py-3.5 bg-zinc-950 hover:bg-zinc-900 text-zinc-500 hover:text-rose-400 border border-zinc-800 hover:border-rose-950/20 rounded-xl text-xs font-semibold tracking-wider font-mono uppercase transition"
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <LogOut className="w-3.5 h-3.5" />
                    Regresar al menú principal
                  </span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ResultsView;
