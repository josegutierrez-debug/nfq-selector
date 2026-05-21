/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PlusCircle, Link, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { RoomDirectory } from "../components/RoomDirectory";
import { BrandLogo } from "../components/BrandLogo";

interface HomeViewProps {
  onCreateSession: () => void;
  onJoinSession: (sessionId: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function HomeView({
  onCreateSession,
  onJoinSession,
  isLoading = false,
  error = null
}: HomeViewProps) {
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [sessionIdInput, setSessionIdInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = sessionIdInput.trim().toUpperCase();
    if (!trimmed) {
      setValidationError("El código de sala es requerido.");
      return;
    }

    if (trimmed.length !== 6) {
      setValidationError("El código debe tener exactamente 6 caracteres.");
      return;
    }

    onJoinSession(trimmed);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-8">
      {/* Brand & Decorative Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto flex items-center justify-center py-2">
          <BrandLogo className="h-12 w-auto opacity-100 drop-shadow-[0_0_15px_rgba(16,185,129,0.1)]" style={{ minHeight: "48px" }} />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 font-sans">
            Sorteo de Turnos
          </h1>
          <p className="text-sm text-zinc-400 max-w-xs mx-auto">
            Crea una sala compartida o únete a una existente para ordenar turnos con total imparcialidad.
          </p>
        </div>
      </div>

      {/* Error Notices */}
      <AnimatePresence mode="popLayout">
        {(error || validationError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-400"
          >
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs font-mono">
              <span className="font-bold uppercase tracking-wider block mb-0.5">Error de Acceso</span>
              {validationError || error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Actions Layer */}
      <div className="space-y-4">
        {!showJoinForm ? (
          <div className="flex flex-col gap-3">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={onCreateSession}
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-950/25 flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              Crear nueva sesión
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                setValidationError(null);
                setShowJoinForm(true);
              }}
              disabled={isLoading}
              className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 hover:text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 border border-zinc-800/80"
            >
              <Link className="w-5 h-5" />
              Conectarse a sesión existente
            </motion.button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <form onSubmit={handleSubmit} className="space-y-3">
              <label 
                htmlFor="sessionId" 
                className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold block"
              >
                Código de la Sala
              </label>
              
              <div className="relative">
                <input
                  id="sessionId"
                  type="text"
                  placeholder="Ej: A9FD5C"
                  maxLength={6}
                  value={sessionIdInput}
                  onChange={(e) => {
                    setSessionIdInput(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3.5 font-mono text-center text-lg tracking-widest text-emerald-400 placeholder:text-zinc-700 uppercase focus:outline-none transition"
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinForm(false);
                    setValidationError(null);
                    setSessionIdInput("");
                  }}
                  disabled={isLoading}
                  className="w-1/3 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-sm font-semibold rounded-xl transition"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-2/3 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-sm rounded-xl transition flex items-center justify-center gap-2"
                >
                  <span>Acceder</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>

      {/* Directory of active lobbies for quick join experience */}
      <RoomDirectory onSelectRoom={onJoinSession} isLoadingRoot={isLoading} />

      {/* Micro-Features Metadata */}
      <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono text-zinc-500">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-500" /> WebSockets Activos
        </span>
        <span>Designed by Rafael Gtz de Calderon</span>
      </div>
    </div>
  );
}

export default HomeView;
