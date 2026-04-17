"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import Link from "next/link";
import { getQuiz } from "@/lib/firestore";
import { Quiz } from "@/lib/types";

type PlayerReportRow = {
  id: string;
  name: string;
  rank: number;
  totalScore: number;
  correctAnswers: number;
  attemptedAnswers: number;
  averageAnswerMs: number;
  accuracyPct: number;
};

type ExportOptions = {
  includeRank: boolean;
  includeTotalScore: boolean;
  includeAttemptedAnswers: boolean;
  includeAccuracy: boolean;
  includeTotalQuestions: boolean;
};

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeRank: true,
  includeTotalScore: true,
  includeAttemptedAnswers: true,
  includeAccuracy: true,
  includeTotalQuestions: false,
};

function formatMsAsSeconds(ms: number): string {
  if (!ms || Number.isNaN(ms)) return "0.00";
  return (ms / 1000).toFixed(2);
}

function csvEscape(value: string | number): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function ResultsScreen({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const { session, players, loading } = useSession(sessionId);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [topN, setTopN] = useState(10);
  const [exportOptions, setExportOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [revealMode, setRevealMode] = useState<"step" | "all">("all");
  const [revealedCount, setRevealedCount] = useState(10);

  useEffect(() => {
    if (!session?.quizId || quiz) return;
    getQuiz(session.quizId).then(setQuiz).catch(() => setQuiz(null));
  }, [session, quiz]);

  if (loading) {
     return <div className="min-h-screen bg-background flex flex-col items-center justify-center"><h1 className="text-3xl text-accent-cyan animate-pulse">Loading Leaderboard...</h1></div>;
  }

  const sortedPlayers = [...players].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.avgResponseTime - b.avgResponseTime; // tie breaker
  });

  const totalQuestions = quiz?.questions?.length || 0;

  const reportRows: PlayerReportRow[] = sortedPlayers.map((player, index) => {
    const attemptedAnswers = player.answers?.length || 0;
    const correctAnswers = (player.answers || []).filter((a) => a.isCorrect).length;
    const avgMs = attemptedAnswers > 0
      ? Math.round((player.answers || []).reduce((acc, curr) => acc + curr.responseTimeMs, 0) / attemptedAnswers)
      : 0;
    const accuracyPct = attemptedAnswers > 0 ? Math.round((correctAnswers / attemptedAnswers) * 100) : 0;

    return {
      id: player.id,
      name: player.name,
      rank: index + 1,
      totalScore: player.totalScore,
      correctAnswers,
      attemptedAnswers,
      averageAnswerMs: avgMs,
      accuracyPct,
    };
  });

  const boundedTopN = Math.min(Math.max(1, topN), Math.max(reportRows.length, 1));
  const topRows = reportRows.slice(0, boundedTopN);
  const visibleRows = revealMode === "all" ? topRows : topRows.slice(0, Math.min(revealedCount, boundedTopN));

  const handleRevealOne = () => {
    setRevealMode("step");
    setRevealedCount((prev) => Math.min(prev + 1, boundedTopN));
  };

  const handleRevealAll = () => {
    setRevealMode("all");
    setRevealedCount(boundedTopN);
  };

  const handleResetReveal = () => {
    setRevealMode("step");
    setRevealedCount(0);
  };

  const toggleExportOption = (key: keyof ExportOptions) => {
    setExportOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const exportCsv = () => {
    const headers = ["Name", "Correct Answers", "Average Answer Time (s)"];
    if (exportOptions.includeRank) headers.push("Rank");
    if (exportOptions.includeTotalScore) headers.push("Total Score");
    if (exportOptions.includeAttemptedAnswers) headers.push("Attempted Answers");
    if (exportOptions.includeAccuracy) headers.push("Accuracy (%)");
    if (exportOptions.includeTotalQuestions) headers.push("Total Questions");

    const lines = reportRows.map((row) => {
      const values: Array<string | number> = [
        row.name,
        row.correctAnswers,
        formatMsAsSeconds(row.averageAnswerMs),
      ];
      if (exportOptions.includeRank) values.push(row.rank);
      if (exportOptions.includeTotalScore) values.push(row.totalScore);
      if (exportOptions.includeAttemptedAnswers) values.push(row.attemptedAnswers);
      if (exportOptions.includeAccuracy) values.push(row.accuracyPct);
      if (exportOptions.includeTotalQuestions) values.push(totalQuestions);
      return values.map(csvEscape).join(",");
    });

    const csv = [headers.map(csvEscape).join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quiz-report-${sessionId}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-12 max-w-4xl mx-auto pt-12 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 w-[800px] h-[500px] bg-accent-yellow/20 rounded-full blur-[150px] -translate-x-1/2 pointer-events-none -z-10"></div>
      
      <div className="text-center space-y-4">
        <h1 className="text-5xl md:text-7xl font-display font-black text-accent-yellow drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] uppercase">Final Results</h1>
        <p className="text-textMuted uppercase tracking-widest">Leaderboard</p>
      </div>

      <section className="rounded-lg border border-elevated p-4 space-y-4 bg-card/70">
        <div className="flex flex-wrap gap-3 items-end justify-between">
          <div>
            <p className="text-sm text-textMuted uppercase tracking-widest">Winner Reveal Controls</p>
            <p className="text-xs text-textMuted mt-1">Show top N players only on screen. Export always includes all players.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-textMuted uppercase tracking-widest">Top N</label>
            <input
              type="number"
              min={1}
              max={Math.max(reportRows.length, 1)}
              value={topN}
              onChange={(e) => {
                const next = Number(e.target.value || 1);
                setTopN(next);
                setRevealedCount(next);
              }}
              className="w-24 px-2 py-1.5 rounded border border-elevated bg-background text-textPrimary"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={handleRevealOne} className="px-3 py-2 rounded border border-accent-cyan/40 text-accent-cyan text-sm font-semibold">
            Reveal One
          </button>
          <button onClick={handleRevealAll} className="px-3 py-2 rounded border border-accent-yellow/40 text-accent-yellow text-sm font-semibold">
            Reveal All Top {boundedTopN}
          </button>
          <button onClick={handleResetReveal} className="px-3 py-2 rounded border border-textMuted/40 text-textMuted text-sm font-semibold">
            Reset Reveal
          </button>
        </div>

        <div className="space-y-2 pt-1">
          <p className="text-sm text-textMuted uppercase tracking-widest">CSV Export Options</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={exportOptions.includeRank} onChange={() => toggleExportOption("includeRank")} /> Rank</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={exportOptions.includeTotalScore} onChange={() => toggleExportOption("includeTotalScore")} /> Total Score</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={exportOptions.includeAttemptedAnswers} onChange={() => toggleExportOption("includeAttemptedAnswers")} /> Attempted Answers</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={exportOptions.includeAccuracy} onChange={() => toggleExportOption("includeAccuracy")} /> Accuracy %</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={exportOptions.includeTotalQuestions} onChange={() => toggleExportOption("includeTotalQuestions")} /> Total Questions</label>
          </div>
          <button onClick={exportCsv} className="mt-2 px-4 py-2 rounded border border-accent-cyan/40 text-accent-cyan font-semibold">
            Export CSV Report
          </button>
        </div>
      </section>

      <div className="space-y-4 max-w-3xl mx-auto mt-12 relative z-10">
        {visibleRows.length === 0 ? (
           <p className="text-center text-textMuted">No players joined.</p>
        ) : (
          visibleRows.map((row, index) => {
            const isTop3 = index < 3;
            let rankColor = "text-textMuted border-elevated";
            if (index === 0) rankColor = "text-accent-yellow border-accent-yellow/50 bg-accent-yellow/10 neon-border-cyan scale-105 shadow-[0_0_30px_rgba(255,215,0,0.3)] z-20";
            else if (index === 1) rankColor = "text-gray-300 border-gray-400 bg-gray-600/10 z-10";
            else if (index === 2) rankColor = "text-amber-600 border-amber-700 bg-amber-900/10 z-10";

            return (
              <div 
                key={row.id} 
                className={`flex items-center justify-between p-6 rounded-lg border-2 transition-all duration-500 hover:scale-[1.02] ${rankColor} ${index === 0 ? 'mb-8' : 'mb-2'}`}
              >
                <div className="flex items-center gap-6">
                  <span className={`text-4xl font-black font-display w-12 text-center opacity-80`}>
                    #{row.rank}
                  </span>
                  <div>
                    <h3 className={`text-2xl font-bold ${index === 0 ? 'text-accent-yellow' : 'text-textPrimary'}`}>{row.name}</h3>
                    <p className="text-sm font-mono opacity-50 block mt-1">
                      {row.correctAnswers} correct
                      {" · "}
                      {formatMsAsSeconds(row.averageAnswerMs)}s avg
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-4xl font-code font-bold ${index === 0 ? 'text-accent-yellow drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]' : 'text-accent-cyan'}`}>
                    {row.totalScore}
                  </p>
                  <p className="text-xs uppercase tracking-widest opacity-50 mt-1">Points</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="text-center mt-16 pt-8">
        <Link href="/" className="inline-block px-8 py-4 bg-transparent border-2 border-accent-cyan text-accent-cyan font-bold uppercase tracking-widest rounded transition-all hover:bg-accent-cyan/10 hover:shadow-[0_0_15px_rgba(0,212,255,0.4)]">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
