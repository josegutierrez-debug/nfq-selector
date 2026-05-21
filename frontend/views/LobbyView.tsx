/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { Copy, Check, Shuffle, RefreshCw, LogOut, Share2, CircleDot, Users, Globe, Settings } from "lucide-react";
import { UserList, Participant } from "../components/UserList";

interface LobbyViewProps {
  sessionId: string;
  currentParticipant: Participant | null;
  participants: Participant[];
  includeHostInDraw?: boolean;
  isPublic?: boolean;
  onGenerateOrder: () => void;
  onUpdateSettings?: (includeHostInDraw: boolean, isPublic: boolean) => void;
  onLeave?: () => void;
  onUpdateAlias?: (newName: string) => void;
}

export function LobbyView({
  sessionId,
  currentParticipant,
  participants,
  includeHostInDraw = true,
  isPublic = true,
  onGenerateOrder,
  onUpdateSettings,
  onLeave,
  onUpdateAlias
}: LobbyViewProps) {
  const [copied, setCopied] = useState(false);
  const isHost = currentParticipant?.isHost || false;
  
  // Calculate active candidates to sort based on host inclusion
  const targetCandidatesCount = includeHostInDraw 
    ? participants.length 
    : participants.filter(p => !p.isHost).length;
    
  const canGenerate = targetCandidatesCount >= 2;

  const handleCopy = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${sessionId.toUpperCase()}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-8">
      
      {/* Upper header with share block */}
      <div className="text-center space-y-3">
        <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-bold block">
          Sala Compartida Activa
        </span>

        {/* Highlighted & Copiable Session Identifier */}
        <div className="flex flex-col items-center justify-center gap-2">
          <button
            onClick={handleCopy}
            className="group relative inline-flex items-center gap-3 bg-zinc-950/80 border border-zinc-800 hover:border-emerald-500/40 px-5 py-3.5 rounded-2xl transition duration-250 cursor-pointer text-zinc-100 w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition" />
              <span className="font-mono text-[11px] text-zinc-500 uppercase font-black">ENLACE:</span>
            </div>
            
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xl tracking-widest font-black text-emerald-400">
                {sessionId.toUpperCase()}
              </span>
              <div className="p-1.5 bg-zinc-900 border border-zinc-800 group-hover:bg-zinc-800 rounded-lg text-zinc-400 transition">
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 animate-scale" />
                ) : (
                  <Copy className="w-3.5 h-3.5 group-hover:text-zinc-200" />
                )}
              </div>
            </div>
          </button>
          
          <span className="text-[10px] text-zinc-650 font-mono">
            {copied ? "¡Enlace de invitación copiado!" : "Haz clic arriba para copiar enlace de invitación"}
          </span>
        </div>
      </div>

      {/* Configuración de Sorteo (Ajustes de Sala) */}
      <div className="bg-zinc-950/40 border border-zinc-800/40 rounded-xl p-4.5 space-y-3">
        <div className="flex items-center gap-1.5 px-1">
          <Settings className="w-3.5 h-3.5 text-zinc-500" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
            Ajustes del Sorteo
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Toggle: Host included */}
          <button
            type="button"
            disabled={!isHost}
            onClick={() => {
              if (onUpdateSettings) {
                onUpdateSettings(!includeHostInDraw, isPublic);
              }
            }}
            className={`p-3 rounded-xl border text-left transition select-none flex items-start gap-3 ${
              isHost ? "cursor-pointer hover:border-emerald-500/30" : "cursor-default brightness-90"
            } ${
              includeHostInDraw
                ? "bg-emerald-500/5 border-emerald-500/25 text-zinc-150"
                : "bg-zinc-900 border-zinc-800 text-zinc-500"
            }`}
          >
            <div className={`p-1.5 rounded-lg border shrink-0 ${
              includeHostInDraw 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                : "bg-zinc-950 border-zinc-850 text-zinc-650"
            }`}>
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-xs font-semibold block leading-snug">Incluir al Host</span>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-bold leading-none">
                {includeHostInDraw ? "SÍ • Participa" : "NO • Observador"}
              </span>
            </div>
          </button>

          {/* Toggle: Public room */}
          <button
            type="button"
            disabled={!isHost}
            onClick={() => {
              if (onUpdateSettings) {
                onUpdateSettings(includeHostInDraw, !isPublic);
              }
            }}
            className={`p-3 rounded-xl border text-left transition select-none flex items-start gap-3 ${
              isHost ? "cursor-pointer hover:border-emerald-500/30" : "cursor-default brightness-90"
            } ${
              isPublic
                ? "bg-emerald-500/5 border-emerald-500/25 text-zinc-150"
                : "bg-zinc-900 border-zinc-800 text-zinc-500"
            }`}
          >
            <div className={`p-1.5 rounded-lg border shrink-0 ${
              isPublic 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                : "bg-zinc-950 border-zinc-850 text-zinc-650"
            }`}>
              <Globe className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-xs font-semibold block leading-snug">Sala Pública</span>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-bold leading-none">
                {isPublic ? "PÚBLICA • Explorador" : "PRIVADA • Secreta"}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* User List Module */}
      <div className="border border-zinc-800/60 rounded-xl p-4 bg-zinc-950/20">
        <UserList 
          participants={participants} 
          currentParticipantId={currentParticipant?.id} 
          onUpdateAlias={onUpdateAlias}
        />
      </div>

      {/* Action / Asymmetry Container */}
      <div className="space-y-4 pt-2">
        {isHost ? (
          /* Host Action View */
          <div className="space-y-3">
            <motion.button
              whileHover={canGenerate ? { scale: 1.01 } : {}}
              whileTap={canGenerate ? { scale: 0.99 } : {}}
              onClick={onGenerateOrder}
              disabled={!canGenerate}
              className={`w-full py-4 rounded-xl font-semibold transition flex items-center justify-center gap-2.5 shadow-lg ${
                canGenerate
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-950/25 cursor-pointer"
                  : "bg-zinc-800/50 text-zinc-500 border border-zinc-800 cursor-not-allowed"
              }`}
            >
              <Shuffle className="w-5 h-5 animate-pulse" />
              <span>Generar orden de turnos</span>
            </motion.button>

            {!canGenerate && (
              <p className="text-center font-mono text-[10px] text-zinc-550 max-w-xs mx-auto">
                No se puede barajar todavía. Se necesitan al menos 2 participantes conectados para poder generar el orden de turnos.
              </p>
            )}
          </div>
        ) : (
          /* Participant Interactive Spinner View */
          <div className="p-5 bg-zinc-950/40 border border-zinc-900/80 rounded-xl flex items-center justify-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="text-emerald-500"
            >
              <CircleDot className="w-5 h-5" />
            </motion.div>
            <motion.span
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="text-emerald-400 font-mono text-xs uppercase tracking-wider font-bold"
            >
              Esperando al resto de usuarios...
            </motion.span>
          </div>
        )}

        {/* Leave Room Button */}
        {onLeave && (
          <button
            onClick={onLeave}
            className="w-full py-3.5 bg-zinc-900/50 hover:bg-zinc-850/80 text-zinc-500 hover:text-rose-400 border border-zinc-800 hover:border-rose-900/30 rounded-xl text-xs font-semibold transition duration-200 flex items-center justify-center gap-2 cursor-pointer font-mono uppercase tracking-wider"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Abandonar esta sala</span>
          </button>
        )}
      </div>

    </div>
  );
}

export default LobbyView;
