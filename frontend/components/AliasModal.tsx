/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Sparkles, Check } from "lucide-react";

interface AliasModalProps {
  isOpen: boolean;
  currentName: string;
  onSave: (newName: string) => void;
  onClose: () => void;
}

export function AliasModal({ isOpen, currentName, onSave, onClose }: AliasModalProps) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("El nombre no puede estar vacío.");
      return;
    }
    onSave(trimmed);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop with fade-in */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Card with pop-in */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl z-10 relative overflow-hidden"
        >
          {/* Ambient lighting highlight */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-4 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                <User className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-bold text-zinc-150 font-sans">
                  Personalizar tu Alias
                </h3>
                <p className="text-xs text-zinc-400">
                  Te hemos asignado un alias divertido. Cámbialo si prefieres.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
                  Tu nombre en la sala
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError(null);
                    }}
                    placeholder="Escribe tu alias..."
                    maxLength={20}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none transition"
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-zinc-650">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500/30 animate-pulse" />
                  </div>
                </div>
                {error && (
                  <p className="text-[10px] font-mono text-rose-450">{error}</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/2 py-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-xl transition font-mono uppercase tracking-wider"
                >
                  Mantener alias
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 font-mono uppercase tracking-wider shadow-md shadow-emerald-500/10"
                >
                  Confirmar
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default AliasModal;
