"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useTimer } from "@/hooks/useTimer";
import { getQuiz, submitAnswer } from "@/lib/firestore";
import { Quiz } from "@/lib/types";
import { auth, signInAnonymously } from "@/lib/firebase";
import { cn } from "@/lib/utils";

const OPTION_LABELS = ["A", "B", "C", "D"];
const OPTION_COLORS = ["#00D4FF", "#9B5DE5", "#FFD700", "#FF6B35"];

export default function PlayScreen({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const router = useRouter();
  const { session, players, loading } = useSession(sessionId);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [qStartTime, setQStartTime] = useState<number>(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timePerQ = quiz?.settings.timePerQuestion || 20;
  const { timeLeft, progress, start: startTimer, stop: stopTimer } = useTimer(timePerQ, () => {
    // Time's up - mark as no answer if not submitted
    if (!hasSubmitted) setHasSubmitted(true);
  });

  useEffect(() => {
    signInAnonymously(auth)
      .then(cred => setPlayerId(cred.user.uid))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (session?.quizId && !quiz) {
      getQuiz(session.quizId).then(setQuiz);
    }
  }, [session, quiz]);

  useEffect(() => {
    if (session?.status === 'ended') {
      router.push(`/results/${sessionId}`);
    }
  }, [session, router, sessionId]);

  // New question
  useEffect(() => {
    if (session?.currentQuestionIndex !== undefined && session.status === 'active') {
      setHasSubmitted(false);
      setSelectedOpt(null);
      setQStartTime(Date.now());
      if (!session.answerRevealed) {
        startTimer(timePerQ);
      }
    }
  }, [session?.currentQuestionIndex, session?.status]);

  // Stop timer on reveal
  useEffect(() => {
    if (session?.answerRevealed) {
      stopTimer();
    }
  }, [session?.answerRevealed]);

  if (loading || !session || !quiz || !playerId) {
    return (
      <div className="min-h-screen bg-[#07071A] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentQ = quiz.questions[session.currentQuestionIndex];
  if (!currentQ) {
    return (
      <div className="min-h-screen bg-[#07071A] flex items-center justify-center">
        <p className="text-[#6B7280] font-[family-name:var(--font-rajdhani)] text-xl">Waiting for next question...</p>
      </div>
    );
  }

  const handleSelect = async (optIndex: number) => {
    if (hasSubmitted || session.answerRevealed || isSubmitting) return;
    setIsSubmitting(true);
    setHasSubmitted(true);
    setSelectedOpt(optIndex);
    stopTimer();

    const isCorrect = optIndex === currentQ.correctIndex;
    const responseTimeMs = Date.now() - qStartTime;
    const timeLimitMs = timePerQ * 1000;

    let score = 0;
    if (isCorrect) {
      const timeRatio = Math.max(0, 1 - (responseTimeMs / timeLimitMs));
      score = Math.floor(Math.max(100, 1000 * timeRatio));
    }

    const me = players.find(p => p.id === playerId);
    const existingAnswers = me ? me.answers : [];

    try {
      await submitAnswer(sessionId, playerId, {
        questionIndex: session.currentQuestionIndex,
        selectedIndex: optIndex,
        isCorrect,
        responseTimeMs,
        score,
      }, existingAnswers);
    } catch (e) {
      console.error("Failed to submit answer:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRevealed = session.answerRevealed;
  const me = players.find(p => p.id === playerId);
  const myAnswer = me?.answers.find(a => a.questionIndex === session.currentQuestionIndex);
  const timerColor = timeLeft > 10 ? '#00D4FF' : timeLeft > 5 ? '#FFD700' : '#FF3366';

  return (
    <div className="min-h-screen flex flex-col bg-[#07071A] relative overflow-hidden">
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />

      {/* Timer bar */}
      {!isRevealed && !hasSubmitted && (
        <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-[#161638]">
          <div
            className="h-full transition-all duration-1000"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${timerColor}, ${timerColor}80)`,
              boxShadow: `0 0 8px ${timerColor}`,
            }}
          />
        </div>
      )}

      <div className="relative z-10 flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 pt-10">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-8">
          <div className="font-[family-name:var(--font-space-mono)] text-[#6B7280] text-sm">
            Q{session.currentQuestionIndex + 1}/{quiz.questions.length}
          </div>
          {/* Timer circle */}
          {!isRevealed && !hasSubmitted && (
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                <circle
                  cx="24" cy="24" r="20" fill="none"
                  stroke={timerColor}
                  strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-exo2)] text-sm font-bold"
                style={{ color: timerColor }}>
                {timeLeft}
              </span>
            </div>
          )}
          <div
            className="px-4 py-2 rounded-full font-[family-name:var(--font-space-mono)] font-bold text-sm text-[#00D4FF]"
            style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)" }}
          >
            {me?.totalScore ?? 0} pts
          </div>
        </div>

        {/* Question */}
        <h2 className="font-[family-name:var(--font-exo2)] text-2xl sm:text-3xl font-bold text-center text-[#EEF2FF] mb-10 leading-snug">
          {currentQ.text}
        </h2>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 content-start">
          {currentQ.options.map((opt, i) => {
            const isSelected = selectedOpt === i;
            const isCorrect = i === currentQ.correctIndex;

            let borderColor = `${OPTION_COLORS[i]}40`;
            let bgColor = `${OPTION_COLORS[i]}08`;
            let opacity = 1;
            let scale = 1;

            if (isRevealed) {
              if (isCorrect) {
                borderColor = '#00FF88';
                bgColor = 'rgba(0,255,136,0.12)';
              } else if (isSelected) {
                borderColor = '#FF3366';
                bgColor = 'rgba(255,51,102,0.08)';
                opacity = 0.8;
              } else {
                opacity = 0.25;
              }
            } else if (hasSubmitted) {
              if (isSelected) {
                borderColor = OPTION_COLORS[i];
                bgColor = `${OPTION_COLORS[i]}18`;
                scale = 1.02;
              } else {
                opacity = 0.4;
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={hasSubmitted || isRevealed || isSubmitting}
                className="relative p-5 rounded-xl text-left transition-all duration-300 disabled:cursor-default group"
                style={{
                  background: bgColor,
                  border: `2px solid ${borderColor}`,
                  opacity,
                  transform: `scale(${scale})`,
                  minHeight: '80px',
                }}
              >
                <div className="flex items-center gap-4">
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-[family-name:var(--font-exo2)] font-bold shrink-0 transition-all"
                    style={{
                      background: isRevealed && isCorrect ? '#00FF88' :
                        isRevealed && isSelected ? '#FF3366' :
                          `${OPTION_COLORS[i]}20`,
                      color: isRevealed && (isCorrect || isSelected) ? '#07071A' : OPTION_COLORS[i],
                    }}
                  >
                    {OPTION_LABELS[i]}
                  </span>
                  <span className="font-[family-name:var(--font-rajdhani)] font-semibold text-lg text-[#EEF2FF] leading-tight">
                    {opt}
                  </span>
                  {isRevealed && isCorrect && (
                    <svg className="ml-auto shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        <div className="h-20 mt-8 flex items-center justify-center">
          {isRevealed && myAnswer && (
            <div className={cn(
              "text-center animate-scale-in",
              myAnswer.isCorrect ? "text-[#00FF88]" : "text-[#FF3366]"
            )}>
              <p className="font-[family-name:var(--font-exo2)] text-3xl font-black uppercase tracking-widest"
                style={{ textShadow: myAnswer.isCorrect ? '0 0 20px rgba(0,255,136,0.6)' : '0 0 20px rgba(255,51,102,0.6)' }}>
                {myAnswer.isCorrect ? `+${myAnswer.score}` : "✕ Wrong"}
              </p>
              {myAnswer.isCorrect && (
                <p className="text-sm text-[#00FF88]/70 font-[family-name:var(--font-space-mono)] mt-1">
                  {(myAnswer.responseTimeMs / 1000).toFixed(1)}s · {myAnswer.score} points
                </p>
              )}
            </div>
          )}
          {isRevealed && !myAnswer && (
            <p className="font-[family-name:var(--font-rajdhani)] text-xl text-[#FF3366] uppercase tracking-widest">
              ✕ No Answer
            </p>
          )}
          {!isRevealed && hasSubmitted && (
            <div className="text-center">
              <p className="font-[family-name:var(--font-rajdhani)] text-xl text-[#9B5DE5] uppercase tracking-widest animate-pulse">
                Answer submitted!
              </p>
              <p className="text-sm text-[#6B7280] font-[family-name:var(--font-space-mono)] mt-1">
                Waiting for host to reveal...
              </p>
            </div>
          )}
          {!isRevealed && !hasSubmitted && (
            <p className="font-[family-name:var(--font-rajdhani)] text-xl font-bold text-[#FFD700] uppercase tracking-widest">
              Pick an answer!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}