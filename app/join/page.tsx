"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSessionByJoinCode, joinSession } from "@/lib/firestore";
import { signInAnonymously, auth } from "@/lib/firebase";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode) setCode(urlCode.toUpperCase());
    const savedName = localStorage.getItem("qb_player_name");
    if (savedName) setName(savedName);
  }, [searchParams]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!code.trim()) { setError("Please enter a room code."); return; }
    if (!name.trim()) { setError("Please enter your nickname."); return; }
    if (name.trim().length < 2) { setError("Nickname must be at least 2 characters."); return; }

    setIsJoining(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const playerId = userCredential.user.uid;

      const session = await getSessionByJoinCode(code.trim());
      if (!session) throw new Error("Room not found. Check your code and try again.");
      if (session.status === 'ended') throw new Error("This quiz has already ended.");

      await joinSession(session.id, playerId, name.trim());
      localStorage.setItem("qb_player_name", name.trim());
      localStorage.setItem("qb_player_id", playerId);

      if (session.status === "active") {
        router.push(`/play/${session.id}`);
      } else {
        router.push(`/lobby/${session.id}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to join session.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#07071A] p-4 relative overflow-hidden">
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#00D4FF]/8 rounded-full blur-[120px] pointer-events-none" />

      {/* Corner decorations */}
      <div className="absolute top-8 left-8 w-12 h-12 border-l-2 border-t-2 border-[#00D4FF]/20" />
      <div className="absolute bottom-8 right-8 w-12 h-12 border-r-2 border-b-2 border-[#00D4FF]/20" />

      <div className="w-full max-w-md z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-block">
            <span
              className="font-[family-name:var(--font-exo2)] text-4xl font-black text-[#00D4FF]"
              style={{ textShadow: "0 0 20px rgba(0,212,255,0.5)" }}
            >
              QUIZ<span style={{ color: '#9B5DE5', textShadow: "0 0 20px rgba(155,93,229,0.5)" }}>BLITZ</span>
            </span>
          </a>
        </div>

        <form
          onSubmit={handleJoin}
          className="rounded-2xl p-8 space-y-6"
          style={{
            background: "rgba(14,14,44,0.9)",
            border: "1px solid rgba(0,212,255,0.2)",
            boxShadow: "0 0 60px rgba(0,212,255,0.08), 0 20px 40px rgba(0,0,0,0.5)",
          }}
        >
          <div className="text-center">
            <h1 className="font-[family-name:var(--font-exo2)] text-3xl font-black text-[#EEF2FF] uppercase tracking-wide">
              Join Game
            </h1>
            <p className="text-[#6B7280] text-sm mt-1 font-[family-name:var(--font-space-mono)]">
              Enter your room code & nickname
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#FF3366]/10 border border-[#FF3366]/30 text-[#FF3366] text-sm font-[family-name:var(--font-rajdhani)] font-semibold flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Room Code */}
            <div>
              <label className="block text-xs font-[family-name:var(--font-space-mono)] text-[#6B7280] uppercase tracking-widest mb-2">
                Room Code
              </label>
              <input
                type="text"
                placeholder="XXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                maxLength={6}
                autoComplete="off"
                className="w-full p-4 rounded-xl text-center font-[family-name:var(--font-space-mono)] text-3xl font-bold tracking-[0.5em] text-[#00D4FF] focus:outline-none transition-all"
                style={{
                  background: "rgba(22,22,56,0.9)",
                  border: `2px solid ${code.length === 6 ? 'rgba(0,212,255,0.5)' : 'rgba(22,22,56,1)'}`,
                }}
                required
              />
            </div>

            {/* Nickname */}
            <div>
              <label className="block text-xs font-[family-name:var(--font-space-mono)] text-[#6B7280] uppercase tracking-widest mb-2">
                Nickname
              </label>
              <input
                type="text"
                placeholder="Your display name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 20))}
                maxLength={20}
                className="w-full p-4 rounded-xl font-[family-name:var(--font-rajdhani)] text-xl font-bold text-[#EEF2FF] placeholder-[#6B7280] focus:outline-none transition-all"
                style={{
                  background: "rgba(22,22,56,0.9)",
                  border: `2px solid ${name.length >= 2 ? 'rgba(155,93,229,0.4)' : 'rgba(22,22,56,1)'}`,
                }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isJoining}
            className="w-full py-4 rounded-xl font-[family-name:var(--font-exo2)] font-black text-xl uppercase tracking-widest text-[#07071A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #00D4FF, #00B4D8)",
              boxShadow: isJoining ? 'none' : '0 0 25px rgba(0,212,255,0.35)',
            }}
          >
            {isJoining ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Joining...
              </span>
            ) : "Join Now →"}
          </button>
        </form>

        <p className="text-center mt-6 text-[#6B7280] text-sm font-[family-name:var(--font-space-mono)]">
          Hosting?{" "}
          <a href="/create" className="text-[#9B5DE5] hover:text-[#B87FFF] transition-colors underline underline-offset-2">
            Create a quiz
          </a>
        </p>
      </div>
    </main>
  );
}

export default function JoinQuiz() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#07071A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <JoinForm />
    </Suspense>
  );
}