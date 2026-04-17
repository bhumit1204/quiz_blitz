"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";

export default function PlayerLobby({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const router = useRouter();
  const { session, players, loading } = useSession(sessionId);

  useEffect(() => {
    if (session?.status === 'active') router.push(`/play/${sessionId}`);
    else if (session?.status === 'ended') router.push(`/results/${sessionId}`);
  }, [session, router, sessionId]);

  const playerName = typeof window !== "undefined" ? localStorage.getItem("qb_player_name") ?? "Player" : "Player";

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-[#07071A] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#07071A] p-4 relative overflow-hidden">
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#9B5DE5]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="text-center space-y-8 z-10 max-w-sm w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[#00FF88] text-sm font-[family-name:var(--font-space-mono)]"
          style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.25)" }}>
          <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
          Connected!
        </div>

        <div>
          <h1 className="font-[family-name:var(--font-exo2)] text-3xl font-black text-[#EEF2FF]">
            You're in,{" "}
            <span
              className="text-[#00D4FF]"
              style={{ textShadow: "0 0 15px rgba(0,212,255,0.4)" }}
            >
              {playerName}
            </span>
            !
          </h1>
          <p className="text-[#6B7280] font-[family-name:var(--font-rajdhani)] mt-2">
            Look for your name on the host screen
          </p>
        </div>

        <div
          className="rounded-2xl p-10 flex flex-col items-center justify-center space-y-6"
          style={{
            background: "rgba(14,14,44,0.9)",
            border: "1px solid rgba(155,93,229,0.25)",
            boxShadow: "0 0 40px rgba(155,93,229,0.08)"
          }}
        >
          {/* Spinner */}
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-4 border-[#9B5DE5]/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-[#9B5DE5] rounded-full animate-spin" />
            <div className="absolute inset-2 border-2 border-t-[#00D4FF] rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-exo2)] text-xl font-bold uppercase tracking-widest text-[#EEF2FF] animate-pulse">
              Waiting for Host...
            </h2>
          </div>
        </div>

        <p className="text-[#6B7280] font-[family-name:var(--font-space-mono)] text-sm">
          {players.length} player{players.length !== 1 ? 's' : ''} in room
        </p>
      </div>
    </div>
  );
}