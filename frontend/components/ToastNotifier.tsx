/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  message: string;
  type: "error" | "success" | "info";
}

interface ToastNotifierProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export function ToastNotifier({ toasts, onRemove }: ToastNotifierProps) {
  return (
    <div className="fixed bottom-6 right-6 z-55 w-full max-w-sm flex flex-col gap-3 pointer-events-none p-4">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void; key?: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const config = {
    error: {
      bg: "bg-red-500/10 border-red-500/20 text-red-400",
      icon: <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />,
      label: "Alerta de Sistema"
    },
    success: {
      bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      icon: <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />,
      label: "Éxito"
    },
    info: {
      bg: "bg-zinc-800/80 border-zinc-700/50 text-zinc-300",
      icon: <Info className="w-5 h-5 shrink-0 text-zinc-400" />,
      label: "Notificación"
    }
  };

  const currentConfig = config[toast.type] || config.info;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`pointer-events-auto w-full p-4 rounded-xl border flex gap-3 shadow-2xl backdrop-blur-md ${currentConfig.bg}`}
    >
      {currentConfig.icon}
      
      <div className="flex-1 space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-wider font-bold block opacity-80">
          {currentConfig.label}
        </span>
        <p className="text-xs font-mono leading-relaxed font-semibold">
          {toast.message}
        </p>
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        className="text-zinc-500 hover:text-zinc-300 transition shrink-0 self-start p-0.5 rounded-lg border border-transparent hover:border-zinc-800"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export default ToastNotifier;
