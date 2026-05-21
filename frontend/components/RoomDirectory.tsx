/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, RotateCw, Globe, HelpCircle, Loader2 } from "lucide-react";

interface ActiveRoom {
  id: string;
  state: "Lobby" | "Locked" | "Result_Displayed";
  participantCount: number;
}

interface RoomDirectoryProps {
  onSelectRoom: (roomId: string) => void;
  isLoadingRoot?: boolean;
}

export function RoomDirectory({ onSelectRoom, isLoadingRoot = false }: RoomDirectoryProps) {
  const [rooms, setRooms] = useState<ActiveRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRooms = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/active-rooms");
      if (!response.ok) {
        throw new Error("No se pudo obtener el directorio de salas.");
      }
      const data = await response.json();
      // Ensure we have an array
      if (data && Array.isArray(data.rooms)) {
        setRooms(data.rooms);
      } else {
        setRooms([]);
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRooms();

    // Auto-refresh the lobby listings every 12 seconds to keep it synchronized
    const interval = setInterval(fetchRooms, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    fetchRooms();
  };

  return (
    <div className="bg-zinc-950/80 border border-zinc-900 rounded-xl p-5 space-y-4">
      {/* Directory Title & Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-500 animate-pulse" />
          <h2 className="text-sm font-mono font-bold tracking-wider text-zinc-300 uppercase">
            Explorador de Salas Activas
          </h2>
        </div>
        
        <button
          onClick={handleRefreshClick}
          disabled={isLoading || isLoadingRoot}
          className="p-1 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 transition duration-150 text-xs font-mono flex items-center gap-1.5 disabled:opacity-50"
          title="Actualizar lista de salas"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
          Recargar
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isLoading && rooms.length === 0 ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-8 text-zinc-500 space-y-2"
          >
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            <span className="text-xs font-mono">Buscando lobbies libres...</span>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-lg text-rose-400 text-center"
          >
            <p className="text-xs font-mono">{error}</p>
          </motion.div>
        ) : rooms.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border border-dashed border-zinc-900 rounded-lg p-6 py-8 text-center space-y-2 bg-zinc-950/20"
          >
            <HelpCircle className="w-8 h-8 text-zinc-700 mx-auto" />
            <div className="space-y-1">
              <p className="text-xs text-zinc-400 font-medium">No hay salas de ingreso libre</p>
              <p className="text-[10px] text-zinc-600 font-mono">Crea una sala nueva para iniciar un sorteo</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 gap-2.5 max-h-52 overflow-y-auto pr-1"
          >
            {rooms.map((room) => (
              <motion.button
                key={room.id}
                whileHover={{ scale: 1.01, borderColor: "rgba(16,185,129,0.2)" }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSelectRoom(room.id)}
                disabled={isLoadingRoot}
                className="w-full flex items-center justify-between p-3.5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 rounded-xl transition text-left group"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-mono font-bold tracking-widest text-emerald-400 group-hover:text-emerald-300">
                    SALA {room.id}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Ingreso libre • Lobby de registro
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800/60 px-2.5 py-1.5 rounded-lg">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-xs font-mono font-semibold text-zinc-300">
                    {room.participantCount} {room.participantCount === 1 ? "usuario" : "usuarios"}
                  </span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RoomDirectory;
