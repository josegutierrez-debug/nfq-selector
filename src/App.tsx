/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from "react";
import { MainLayout } from "../frontend/layouts/MainLayout";
import { HomeView } from "../frontend/views/HomeView";
import { LobbyView } from "../frontend/views/LobbyView";
import { ResultsView, Participant, SessionState } from "../frontend/views/ResultsView";
import { ToastNotifier, ToastMessage } from "../frontend/components/ToastNotifier";
import { AliasModal } from "../frontend/components/AliasModal";
import { env } from "../frontend/config/env";

// Retrieve or generate a persistent clientId for reconnect resilience
const getOrCreateClientId = (): string => {
  let id = localStorage.getItem("turn_slot_client_id");
  if (!id) {
    id = `client_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem("turn_slot_client_id", id);
  }
  return id;
};

export default function App() {
  const clientId = getOrCreateClientId();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [shuffledOrder, setShuffledOrder] = useState<string[] | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>("Lobby");
  const [includeHostInDraw, setIncludeHostInDraw] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [showAliasPopup, setShowAliasPopup] = useState(false);
  const [hasShownAliasPopupForSession, setHasShownAliasPopupForSession] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const socketRef = useRef<WebSocket | null>(null);

  const addToast = (message: string, type: "error" | "success" | "info" = "info") => {
    const freshId = `toast_${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => [...prev, { id: freshId, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initialize and connect to WebSocket server
  useEffect(() => {
    const wsUrl = env.WS_URL;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connection established");
      
      // Attempt automatically reconnecting if we have cached session in memory
      const activeSession = sessionStorage.getItem("active_session_id");
      
      // Support inviting links via URL parameter seamlessly!
      const params = new URLSearchParams(window.location.search);
      const urlRoomId = params.get("room") || params.get("session");
      const targetSession = urlRoomId || activeSession;

      if (targetSession) {
        setIsLoading(true);
        ws.send(JSON.stringify({
          type: "JOIN_SESSION",
          payload: {
            sessionId: targetSession,
            clientId: clientId
          }
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WS Receive:", data);

        switch (data.type) {
          case "SESSION_CREATED": {
            const { sessionId: sId, state, hostId, hostName, participants: pList, includeHostInDraw: inc, isPublic: pub } = data.payload;
            setSessionId(sId);
            setSessionState(state);
            setCurrentParticipant({
              id: clientId,
              name: hostName || "Host",
              isHost: true,
              joinedAt: new Date()
            });
            setParticipants(pList || [{
              id: clientId,
              name: hostName || "Host",
              isHost: true,
              joinedAt: new Date()
            }]);
            setShuffledOrder(null);
            setIncludeHostInDraw(inc !== false);
            setIsPublic(pub !== false);
            sessionStorage.setItem("active_session_id", sId);
            
            // Keep URL in sync with active room for copy-paste-ability
            window.history.replaceState(null, "", `?room=${sId.toUpperCase()}`);
            
            setIsLoading(false);
            setError(null);
            addToast("¡Sala de sorteo creada exitosamente!", "success");
            
            // Automatically trigger the alias update popup for the creator
            if (hasShownAliasPopupForSession !== sId) {
              setShowAliasPopup(true);
              setHasShownAliasPopupForSession(sId);
            }
            break;
          }

          case "SESSION_JOINED": {
            const { sessionId: sId, state, currentParticipant: currentP, participants: pList, shuffledOrder: order, includeHostInDraw: inc, isPublic: pub } = data.payload;
            setSessionId(sId);
            setSessionState(state);
            setCurrentParticipant(currentP);
            setParticipants(pList);
            setShuffledOrder(order);
            setIncludeHostInDraw(inc !== false);
            setIsPublic(pub !== false);
            sessionStorage.setItem("active_session_id", sId);
            
            // Keep URL in sync with active room for copy-paste-ability
            window.history.replaceState(null, "", `?room=${sId.toUpperCase()}`);
            
            setIsLoading(false);
            setError(null);
            addToast("¡Inicio de sesión correcto en la sala!", "success");
            
            // Automatically trigger the alias update popup for the joiner
            if (hasShownAliasPopupForSession !== sId) {
              setShowAliasPopup(true);
              setHasShownAliasPopupForSession(sId);
            }
            break;
          }

          case "LOBBY_UPDATE": {
            const { state, participants: pList, shuffledOrder: order, includeHostInDraw: inc, isPublic: pub } = data.payload;
            
            // Check if state changed to Result_Displayed to notify users
            setSessionState((prev) => {
              if (state === "Result_Displayed" && prev !== "Result_Displayed") {
                addToast("¡Sorteo finalizado! Posiciones barajadas.", "success");
              }
              return state;
            });

            setParticipants(pList);
            setShuffledOrder(order);
            if (inc !== undefined) setIncludeHostInDraw(inc);
            if (pub !== undefined) setIsPublic(pub);
            
            // Sync currentParticipant
            const syncMe = pList.find((p: Participant) => p.id === clientId);
            if (syncMe) {
              setCurrentParticipant(syncMe);
            }
            break;
          }

          case "ERROR": {
            setError(data.payload.message);
            setIsLoading(false);
            addToast(data.payload.message, "error");
            
            // Resolve deadlocks if the cached session does not exist or has expired
            if (data.payload.message.includes("no existe") || data.payload.message.includes("vencido")) {
              sessionStorage.removeItem("active_session_id");
              setSessionId(null);
              // Safely clear the invitation/stale room parameter to prevent reload error loops
              const params = new URLSearchParams(window.location.search);
              if (params.has("room") || params.has("session")) {
                window.history.replaceState(null, "", window.location.pathname);
              }
            }
            break;
          }
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => {
      ws.close();
    };
  }, [clientId]);

  const handleCreateSession = () => {
    setIsLoading(true);
    setError(null);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "CREATE_SESSION",
        payload: { clientId }
      }));
    } else {
      setError("No se pudo conectar con el servidor de juegos.");
      setIsLoading(false);
    }
  };

  const handleJoinSession = (sId: string) => {
    setIsLoading(true);
    setError(null);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "JOIN_SESSION",
        payload: { sessionId: sId, clientId }
      }));
    } else {
      setError("No se pudo conectar con el servidor de juegos.");
      setIsLoading(false);
    }
  };

  const handleGenerateOrder = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "GENERATE_ORDER"
      }));
    }
  };

  const handleUpdateAlias = (newName: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "UPDATE_ALIAS",
        payload: { newName }
      }));
    }
  };

  const handleUpdateSettings = (inc: boolean, pub: boolean) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "UPDATE_SETTINGS",
        payload: { includeHostInDraw: inc, isPublic: pub }
      }));
    }
  };

  const handleLeave = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "LEAVE_SESSION"
      }));
    }
    sessionStorage.removeItem("active_session_id");
    setSessionId(null);
    setCurrentParticipant(null);
    setParticipants([]);
    setShuffledOrder(null);
    setSessionState("Lobby");
    setError(null);
    
    // Clear URL parameters smoothly
    window.history.replaceState(null, "", window.location.pathname);
    
    window.location.reload(); // Force full reload to reset identity smoothly
  };

  return (
    <>
      <MainLayout hideBrandLogo={!sessionId}>
        {!sessionId ? (
          <HomeView
            onCreateSession={handleCreateSession}
            onJoinSession={handleJoinSession}
            isLoading={isLoading}
            error={error}
          />
        ) : sessionState === "Result_Displayed" ? (
          <ResultsView
            sessionId={sessionId}
            state={sessionState}
            currentParticipant={currentParticipant}
            participants={participants}
            shuffledOrder={shuffledOrder}
            onLeave={handleLeave}
            onReorder={handleGenerateOrder}
          />
        ) : (
          <LobbyView
            sessionId={sessionId}
            currentParticipant={currentParticipant}
            participants={participants}
            includeHostInDraw={includeHostInDraw}
            isPublic={isPublic}
            onGenerateOrder={handleGenerateOrder}
            onUpdateSettings={handleUpdateSettings}
            onUpdateAlias={handleUpdateAlias}
            onLeave={handleLeave}
          />
        )}
      </MainLayout>
      <ToastNotifier toasts={toasts} onRemove={removeToast} />
      
      <AliasModal
        isOpen={showAliasPopup && !!currentParticipant}
        currentName={currentParticipant?.name || ""}
        onSave={(newName) => {
          handleUpdateAlias(newName);
          setShowAliasPopup(false);
          addToast("¡Nombre modificado correctamente!", "success");
        }}
        onClose={() => setShowAliasPopup(false)}
      />
    </>
  );
}

