"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { useSession } from "@/hooks/useSession";
import { useTimer } from "@/hooks/useTimer";
import { canUserManageSession, getQuiz, updateSessionStatus, advanceQuestion, revealAnswer, startSession, updateAnswerCountVisibility } from "@/lib/firestore";
import { Quiz } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizerAuthGuard } from "@/hooks/useOrganizerAuthGuard";

const OPTION_LABELS = ["A", "B", "C", "D"];
const OPTION_COLORS = ["#00D4FF", "#9B5DE5", "#FFD700", "#FF6B35"];

export default function HostPanel({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { loading: guardLoading, isOrganizerAuthenticated } = useOrganizerAuthGuard("/auth");
  const { session, players, loading } = useSession(sessionId);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [origin, setOrigin] = useState("");
  const [hasManageAccess, setHasManageAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const fallbackOrigin = window.location.origin;

    fetch("/api/network-ip")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ip?: string } | null) => {
        if (data?.ip) {
          setOrigin(`http://${data.ip}:3000`);
        } else {
          setOrigin(fallbackOrigin);
        }
      })
      .catch(() => setOrigin(fallbackOrigin));
  }, []);

  useEffect(() => {
    if (session?.quizId && !quiz) {
      getQuiz(session.quizId).then(setQuiz);
    }
  }, [session, quiz]);

  useEffect(() => {
    if (!session || !user) return;
    canUserManageSession(session.id, user.uid)
      .then((allowed) => {
        setHasManageAccess(allowed);
        if (!allowed) router.replace("/dashboard");
      })
      .catch(() => {
        setHasManageAccess(false);
        router.replace("/dashboard");
      });
  }, [session, user, router]);

  const timePerQ = quiz?.settings.timePerQuestion || 20;
  const { timeLeft, progress, start: startTimer, stop: stopTimer } = useTimer(timePerQ);

  // Start timer when question changes
  useEffect(() => {
    if (session?.status === 'active' && session.currentQuestionIndex >= 0 && !session.answerRevealed) {
      startTimer(timePerQ);
    } else {
      stopTimer();
    }
  }, [session?.currentQuestionIndex, session?.status, session?.answerRevealed]);

  const handleStart = async () => {
    await startSession(sessionId);
  };

  const handleToggleAnswerCounts = async () => {
    const current = session?.showAnswerCounts ?? false;
    await updateAnswerCountVisibility(sessionId, !current);
  };

  const handleNext = async () => {
    if (!session || !quiz) return;
    stopTimer();
    if (session.currentQuestionIndex + 1 >= quiz.questions.length) {
      handleEnd();
    } else {
      await advanceQuestion(sessionId, session.currentQuestionIndex + 1);
    }
  };

  const handleReveal = async () => {
    stopTimer();
    await revealAnswer(sessionId);
  };

  const handleEnd = async () => {
    stopTimer();
    await updateSessionStatus(sessionId, 'ended');
    router.push(`/results/${sessionId}`);
  };

  if (authLoading || guardLoading || !isOrganizerAuthenticated || loading || !session || !quiz || hasManageAccess === null) {
    return (
      <div className="min-h-screen bg-[#07071A] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
        <p className="font-[family-name:var(--font-rajdhani)] text-[#6B7280] text-lg uppercase tracking-widest">
          Loading Room...
        </p>
      </div>
    );
  }

  const joinUrl = `${origin}/join?code=${session.joinCode}`;
  const currentQ = quiz.questions[session.currentQuestionIndex];

  // Calculate poll data
  const pollCounts = [0, 0, 0, 0];
  if (currentQ && session.currentQuestionIndex >= 0) {
    players.forEach(p => {
      const ans = p.answers.find(a => a.questionIndex === session.currentQuestionIndex);
      if (ans && ans.selectedIndex >= 0 && ans.selectedIndex < 4) {
        pollCounts[ans.selectedIndex]++;
      }
    });
  }
  const totalAnswers = pollCounts.reduce((a, b) => a + b, 0);
  const answeredCount = players.filter(p =>
    p.answers.some(a => a.questionIndex === session.currentQuestionIndex)
  ).length;
  const showAnswerCounts = session.showAnswerCounts ?? false;

  const timerColor = timeLeft > 10 ? '#00D4FF' : timeLeft > 5 ? '#FFD700' : '#FF3366';

  return (
    <div className="min-h-screen bg-[#07071A] relative overflow-hidden">
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <header className="flex flex-wrap justify-between items-center gap-4 p-4 rounded-xl"
          style={{ background: "rgba(14,14,44,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <h1 className="font-[family-name:var(--font-exo2)] text-2xl font-bold text-[#EEF2FF]">{quiz.title}</h1>
            <p className="text-sm font-[family-name:var(--font-space-mono)] text-[#6B7280] mt-0.5">
              Status: <span className="text-[#9B5DE5] uppercase">{session.status}</span>
              {session.status === 'active' && quiz && (
                <span className="ml-3">· Q{session.currentQuestionIndex + 1}/{quiz.questions.length}</span>
              )}
            </p>
          </div>
          <div className="text-center">
            <p
              className="text-5xl font-[family-name:var(--font-space-mono)] font-bold tracking-widest text-[#00D4FF]"
              style={{ textShadow: "0 0 20px rgba(0,212,255,0.5)" }}
            >
              {session.joinCode}
            </p>
            <p className="text-xs text-[#6B7280] mt-1 font-[family-name:var(--font-space-mono)]">
              {origin}/join
            </p>
          </div>
          <button
            onClick={handleEnd}
            className="px-4 py-2 rounded-lg font-[family-name:var(--font-rajdhani)] font-bold text-sm uppercase tracking-wider text-[#FF3366] transition-all hover:bg-[#FF3366]/10"
            style={{ border: "1px solid rgba(255,51,102,0.3)" }}
          >
            End Session
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar */}
          <div className="space-y-5">
            {/* QR + player count */}
            <div className="rounded-xl p-5 text-center space-y-4" style={{
              background: "rgba(14,14,44,0.9)",
              border: "1px solid rgba(0,212,255,0.2)",
            }}>
              <h2 className="font-[family-name:var(--font-rajdhani)] text-sm uppercase tracking-widest text-[#6B7280]">
                Scan to Join
              </h2>
              {origin && <QRCodeDisplay joinUrl={joinUrl} size={140} />}
              <div>
                <p
                  className="text-5xl font-bold font-[family-name:var(--font-exo2)] text-[#00D4FF]"
                  style={{ textShadow: "0 0 15px rgba(0,212,255,0.4)" }}
                >
                  {players.length}
                </p>
                <p className="text-xs text-[#6B7280] uppercase tracking-widest font-[family-name:var(--font-space-mono)] mt-1">
                  Players Joined
                </p>
              </div>
            </div>

            {/* Timer (during active) */}
            {session.status === 'active' && !session.answerRevealed && (
              <div className="rounded-xl p-5 text-center" style={{
                background: "rgba(14,14,44,0.9)",
                border: `1px solid ${timerColor}40`,
              }}>
                <p className="text-xs uppercase tracking-widest font-[family-name:var(--font-space-mono)] mb-3"
                  style={{ color: timerColor }}>
                  Time Remaining
                </p>
                {/* Circular progress */}
                <div className="relative w-24 h-24 mx-auto">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle
                      cx="48" cy="48" r="40" fill="none"
                      stroke={timerColor}
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s', filter: `drop-shadow(0 0 6px ${timerColor})` }}
                    />
                  </svg>
                  <span
                    className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-exo2)] text-3xl font-black"
                    style={{ color: timerColor }}
                  >
                    {timeLeft}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-2 font-[family-name:var(--font-space-mono)]">
                  {answeredCount}/{players.length} answered
                </p>
              </div>
            )}

            {/* Controls */}
            <div className="rounded-xl p-5 space-y-3" style={{
              background: "rgba(14,14,44,0.9)",
              border: "1px solid rgba(255,255,255,0.07)"
            }}>
              <h2 className="font-[family-name:var(--font-rajdhani)] text-sm uppercase tracking-widest text-[#6B7280] mb-3">
                Host Controls
              </h2>
              {session.status === 'lobby' ? (
                <button
                  onClick={handleStart}
                  disabled={players.length === 0}
                  className="w-full py-4 rounded-xl font-[family-name:var(--font-exo2)] font-black text-lg uppercase tracking-wider text-[#07071A] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg, #00FF88, #00D4AA)",
                    boxShadow: players.length > 0 ? '0 0 25px rgba(0,255,136,0.35)' : 'none',
                  }}
                >
                  {players.length === 0 ? 'Waiting for players...' : '▶ Start Quiz'}
                </button>
              ) : session.status === 'active' ? (
                <>
                  <button
                    onClick={handleToggleAnswerCounts}
                    className="w-full py-3 rounded-xl font-[family-name:var(--font-rajdhani)] font-bold text-base uppercase tracking-wider transition-all"
                    style={{
                      background: showAnswerCounts ? 'rgba(0,212,255,0.15)' : 'rgba(22,22,56,0.5)',
                      border: `1px solid ${showAnswerCounts ? 'rgba(0,212,255,0.45)' : 'rgba(107,114,128,0.45)'}`,
                      color: showAnswerCounts ? '#00D4FF' : '#9CA3AF',
                    }}
                  >
                    {showAnswerCounts ? 'Hide Live Answer Count' : 'Show Live Answer Count'}
                  </button>
                  <button
                    onClick={handleReveal}
                    disabled={session.answerRevealed}
                    className="w-full py-3 rounded-xl font-[family-name:var(--font-rajdhani)] font-bold text-base uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: session.answerRevealed ? 'rgba(22,22,56,0.5)' : 'rgba(155,93,229,0.15)',
                      border: '1px solid rgba(155,93,229,0.4)',
                      color: '#9B5DE5',
                    }}
                  >
                    {session.answerRevealed ? '✓ Answer Revealed' : 'Reveal Answer'}
                  </button>
                  <button
                    onClick={handleNext}
                    className="w-full py-4 rounded-xl font-[family-name:var(--font-exo2)] font-black text-lg uppercase tracking-wider text-[#07071A] transition-all hover:scale-[1.02]"
                    style={{
                      background: "linear-gradient(135deg, #00D4FF, #00B4D8)",
                      boxShadow: '0 0 20px rgba(0,212,255,0.3)',
                    }}
                  >
                    {session.currentQuestionIndex + 1 >= quiz.questions.length ? 'Finish Quiz →' : 'Next Question →'}
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Lobby state */}
            {session.status === 'lobby' && (
              <div className="rounded-xl p-8 min-h-[450px] flex flex-col justify-center" style={{
                background: "rgba(14,14,44,0.9)",
                border: "1px solid rgba(255,255,255,0.07)"
              }}>
                <h2 className="font-[family-name:var(--font-exo2)] text-3xl font-bold text-[#6B7280] text-center mb-8">
                  Waiting for players...
                </h2>
                <div className="flex flex-wrap gap-3 justify-center">
                  {players.length === 0 ? (
                    <p className="text-[#6B7280] font-[family-name:var(--font-space-mono)] text-sm">
                      No players yet. Share the code above!
                    </p>
                  ) : (
                    players.map(p => (
                      <span
                        key={p.id}
                        className="px-4 py-2 rounded-full font-[family-name:var(--font-rajdhani)] font-bold text-[#00D4FF] animate-scale-in"
                        style={{
                          background: "rgba(0,212,255,0.1)",
                          border: "1px solid rgba(0,212,255,0.25)",
                        }}
                      >
                        {p.name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Active question */}
            {session.status === 'active' && currentQ && (
              <div className="rounded-xl p-6 md:p-8 flex flex-col space-y-6" style={{
                background: "rgba(14,14,44,0.9)",
                border: "1px solid rgba(0,212,255,0.15)",
                minHeight: "500px",
              }}>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-[family-name:var(--font-space-mono)] text-[#6B7280] uppercase tracking-widest">
                    Question {session.currentQuestionIndex + 1} / {quiz.questions.length}
                  </span>
                  <span className="text-xs font-[family-name:var(--font-space-mono)] text-[#6B7280]">
                    {answeredCount}/{players.length} answered
                  </span>
                </div>

                <h2 className="font-[family-name:var(--font-exo2)] text-2xl md:text-3xl font-bold text-[#EEF2FF] leading-snug text-center py-2">
                  {currentQ.text}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                  {currentQ.options.map((opt, i) => {
                    const isCorrect = i === currentQ.correctIndex;
                    const widthPct = showAnswerCounts && totalAnswers > 0 ? (pollCounts[i] / totalAnswers) * 100 : 0;
                    const showReveal = session.answerRevealed;

                    return (
                      <div
                        key={i}
                        className="relative flex items-center p-4 rounded-xl overflow-hidden transition-all duration-500"
                        style={{
                          background: showReveal
                            ? (isCorrect ? 'rgba(0,255,136,0.1)' : 'rgba(22,22,56,0.5)')
                            : 'rgba(22,22,56,0.7)',
                          border: showReveal
                            ? `2px solid ${isCorrect ? '#00FF88' : 'rgba(255,255,255,0.06)'}`
                            : `2px solid ${OPTION_COLORS[i]}30`,
                          opacity: showReveal && !isCorrect ? 0.4 : 1,
                        }}
                      >
                        {/* Poll fill bar */}
                        <div
                          className="absolute inset-0 transition-all duration-700"
                          style={{
                            width: `${widthPct}%`,
                            background: `${OPTION_COLORS[i]}18`,
                            borderRight: widthPct > 0 ? `2px solid ${OPTION_COLORS[i]}40` : 'none',
                          }}
                        />
                        <div className="relative z-10 flex items-center gap-3 w-full">
                          <span
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-[family-name:var(--font-exo2)] font-bold shrink-0"
                            style={{
                              background: `${OPTION_COLORS[i]}20`,
                              color: OPTION_COLORS[i],
                              border: `1px solid ${OPTION_COLORS[i]}40`,
                            }}
                          >
                            {OPTION_LABELS[i]}
                          </span>
                          <span className="flex-1 font-[family-name:var(--font-rajdhani)] font-medium text-[#EEF2FF] text-base">
                            {opt}
                          </span>
                          <div className="text-right shrink-0">
                            {showAnswerCounts && totalAnswers > 0 && (
                              <span className="font-[family-name:var(--font-space-mono)] text-xs text-[#6B7280]">
                                {pollCounts[i]}
                              </span>
                            )}
                          </div>
                        </div>
                        {showReveal && isCorrect && (
                          <svg className="absolute right-3 top-3 z-10" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}