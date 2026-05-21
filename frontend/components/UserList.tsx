/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, Clock, Shield, Pencil, Check, X } from "lucide-react";

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: string | Date;
}

interface UserListProps {
  participants: Participant[];
  currentParticipantId?: string;
  onUpdateAlias?: (newName: string) => void;
}

export function UserList({ participants, currentParticipantId, onUpdateAlias }: UserListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");

  // Sort participants so that current participant (Me) is at the top of the list!
  // This satisfies the Host seeing their own name at the top of the list perfectly.
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.id === currentParticipantId) return -1;
    if (b.id === currentParticipantId) return 1;
    if (a.isHost) return -1;
    if (b.isHost) return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-zinc-500 text-xs font-mono uppercase tracking-wider font-semibold px-2">
        <span className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-emerald-500" />
          Participantes ({participants.length})
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <Clock className="w-4 h-4 text-zinc-600" />
          En línea
        </span>
      </div>

      <div className="max-h-60 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin scrollbar-thumb-zinc-850">
        <AnimatePresence initial={false} mode="popLayout">
          {sortedParticipants.map((participant, index) => {
            const isMe = participant.id === currentParticipantId;
            const isEditing = editingId === participant.id;

            return (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
                  isMe
                    ? "bg-zinc-800/20 border-zinc-800"
                    : "bg-zinc-900/40 border-zinc-900/80"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 mr-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm select-none shrink-0 ${
                    participant.isHost 
                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700/35"
                  }`}>
                    {participant.name.charAt(0).toUpperCase()}
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={25}
                        className="bg-zinc-950 border border-emerald-500 text-emerald-300 font-mono text-xs px-2.5 py-1.5 rounded-lg focus:outline-none w-full max-w-[180px]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const trimmed = editName.trim();
                            if (trimmed && onUpdateAlias) {
                              onUpdateAlias(trimmed);
                            }
                            setEditingId(null);
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const trimmed = editName.trim();
                          if (trimmed && onUpdateAlias) {
                            onUpdateAlias(trimmed);
                          }
                          setEditingId(null);
                        }}
                        className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-400 rounded-lg transition shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 overflow-hidden min-w-0">
                      <span className="font-mono text-sm text-zinc-200 truncate font-semibold">
                        {participant.name}
                      </span>
                      {isMe && (
                        <span className="text-[10px] text-zinc-500 font-normal shrink-0 select-none">(Tú)</span>
                      )}
                      {isMe && onUpdateAlias && (
                        <button
                          onClick={() => {
                            setEditingId(participant.id);
                            setEditName(participant.name);
                          }}
                          className="p-1 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800/40 rounded-md transition shrink-0 cursor-pointer"
                          title="Editar mi alias"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {participant.isHost && (
                  <span className="px-2 py-0.5 text-[10px] uppercase font-mono bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-md font-bold flex items-center gap-1 select-none shrink-0">
                    <Shield className="w-3 h-3" />
                    Host
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default UserList;
