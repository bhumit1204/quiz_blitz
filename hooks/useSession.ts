"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection } from "firebase/firestore";
import { Session, Player } from "@/lib/types";

export function useSession(sessionId: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const sessionRef = doc(db, "sessions", sessionId);
    const unsubSession = onSnapshot(
      sessionRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setSession({ id: docSnap.id, ...docSnap.data() } as Session);
        } else {
          setSession(null);
          setError("Session not found");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Session listener error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    const playersRef = collection(db, "sessions", sessionId, "players");
    const unsubPlayers = onSnapshot(
      playersRef,
      (snapshot) => {
        const pData: Player[] = [];
        snapshot.forEach(docSnap => {
          pData.push({ id: docSnap.id, ...docSnap.data() } as Player);
        });
        setPlayers(pData);
      },
      (err) => {
        console.error("Players listener error:", err);
      }
    );

    return () => {
      unsubSession();
      unsubPlayers();
    };
  }, [sessionId]);

  return { session, players, loading, error };
}