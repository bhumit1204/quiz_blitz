"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createQuiz, createSession, createTeam, getUserTeams } from "@/lib/firestore";
import { Question, Team } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizerAuthGuard } from "@/hooks/useOrganizerAuthGuard";

const OPTION_LABELS = ["A", "B", "C", "D"];
const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy", color: "#00FF88" },
  { value: "medium", label: "Medium", color: "#FFD700" },
  { value: "hard", label: "Hard", color: "#FF3366" },
];

export default function CreateQuiz() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { loading: guardLoading, isOrganizerAuthenticated } = useOrganizerAuthGuard("/auth");
  const [title, setTitle] = useState("");
  const [hostPassword, setHostPassword] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [genCount, setGenCount] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [error, setError] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [timePerQuestion, setTimePerQuestion] = useState(20);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [teamMode, setTeamMode] = useState<"none" | "existing" | "new">("none");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamEmails, setNewTeamEmails] = useState("");

  useEffect(() => {
    if (!user || user.isAnonymous) return;
    getUserTeams(user.uid)
      .then(setTeams)
      .catch(() => setTeams([]));
  }, [user]);

  const parseEmailList = (value: string) =>
    value
      .split(/[\n,;]/)
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v.length > 0);

  const resolveTeamSelection = async (): Promise<{ teamId: string | null; teamName: string | null }> => {
    if (!user || user.isAnonymous) {
      throw new Error("Please sign in as organizer first.");
    }

    if (teamMode === "none") return { teamId: null, teamName: null };

    if (teamMode === "existing") {
      if (!selectedTeamId) {
        throw new Error("Select an existing team.");
      }
      const existing = teams.find((t) => t.id === selectedTeamId);
      if (!existing) {
        throw new Error("Selected team was not found.");
      }
      return { teamId: existing.id, teamName: existing.name };
    }

    if (!newTeamName.trim()) {
      throw new Error("New team name is required.");
    }
    if (!user.email) {
      throw new Error("Your account email is missing. Use an email-based account to create teams.");
    }
    const emails = parseEmailList(newTeamEmails);
    const teamId = await createTeam(newTeamName.trim(), user.uid, user.email, emails);
    return { teamId, teamName: newTeamName.trim() };
  };

  const handleManualAdd = () => {
    const newQ: Question = {
      id: crypto.randomUUID(),
      text: "",
      options: ["", "", "", ""],
      correctIndex: 0,
    };
    setQuestions(prev => [...prev, newQ]);
    setExpandedQ(newQ.id);
  };

  const generateWithAI = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic first.");
      return;
    }
    setError("");
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), count: genCount, difficulty }),
      });
      const data = await res.json();
      if (res.ok && data.questions) {
        const newQuestions: Question[] = data.questions.map((q: any) => ({
          ...q,
          id: crypto.randomUUID(),
        }));
        setQuestions(prev => [...prev, ...newQuestions]);
        setTopic("");
      } else {
        setError(data.error || "Failed to generate questions.");
      }
    } catch {
      setError("Failed to connect to AI service. Check your API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const updateOption = (qId: string, optIndex: number, value: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const newOptions = [...q.options];
      newOptions[optIndex] = value;
      return { ...q, options: newOptions };
    }));
  };

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
    if (expandedQ === id) setExpandedQ(null);
  };

  const moveQuestion = (id: string, direction: 'up' | 'down') => {
    const idx = questions.findIndex(q => q.id === id);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === questions.length - 1) return;
    const newQ = [...questions];
    const swap = direction === 'up' ? idx - 1 : idx + 1;
    [newQ[idx], newQ[swap]] = [newQ[swap], newQ[idx]];
    setQuestions(newQ);
  };

  const handleLaunch = async () => {
    setError("");
    if (!user || user.isAnonymous) { setError("Please sign in as organizer first."); return; }
    if (!title.trim()) { setError("Quiz title is required."); return; }
    if (questions.length === 0) { setError("Add at least one question."); return; }
    const incomplete = questions.find(q => !q.text.trim() || q.options.some(o => !o.trim()));
    if (incomplete) { setError("All questions must have text and all 4 options filled in."); return; }

    setIsLaunching(true);
    try {
      const { teamId, teamName } = await resolveTeamSelection();
      const quizId = await createQuiz({
        ownerId: user.uid,
        ownerEmail: user.email || null,
        teamId,
        teamName,
        title: title.trim(),
        hostPassword: hostPassword.trim(),
        settings: { timePerQuestion, autoAdvance: false, autoReveal: false },
        questions,
      });
      const sessionId = await createSession(quizId, false, user.uid, teamId);
      router.push(`/host/${sessionId}`);
    } catch (e: any) {
      setError("Failed to launch: " + (e.message || "Unknown error"));
    } finally {
      setIsLaunching(false);
    }
  };

  const handleSaveDraft = async () => {
    setError("");
    if (!user || user.isAnonymous) { setError("Please sign in as organizer first."); return; }
    if (!title.trim()) { setError("Quiz title is required."); return; }
    if (questions.length === 0) { setError("Add at least one question."); return; }
    const incomplete = questions.find(q => !q.text.trim() || q.options.some(o => !o.trim()));
    if (incomplete) { setError("All questions must have text and all 4 options filled in."); return; }

    setIsSaving(true);
    try {
      const { teamId, teamName } = await resolveTeamSelection();
      await createQuiz({
        ownerId: user.uid,
        ownerEmail: user.email || null,
        teamId,
        teamName,
        title: title.trim(),
        hostPassword: hostPassword.trim(),
        settings: { timePerQuestion, autoAdvance: false, autoReveal: false },
        questions,
      });
      router.push("/dashboard");
    } catch (e: any) {
      setError("Failed to save quiz: " + (e.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || guardLoading || !isOrganizerAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07071A] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07071A] relative overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-[#9B5DE5]/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10 space-y-8 pb-32">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <a href="/" className="text-[#6B7280] hover:text-[#00D4FF] transition-colors text-sm font-[family-name:var(--font-space-mono)]">
            ← Back
          </a>
          <h1
            className="font-[family-name:var(--font-exo2)] text-4xl font-black text-[#00D4FF]"
            style={{ textShadow: "0 0 20px rgba(0,212,255,0.4)" }}
          >
            Create Quiz
          </h1>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg bg-[#FF3366]/10 border border-[#FF3366]/40 text-[#FF3366] font-[family-name:var(--font-rajdhani)] font-semibold flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Section: General Info */}
        <section className="rounded-xl p-6 space-y-4" style={{
          background: "rgba(14,14,44,0.8)",
          border: "1px solid rgba(0,212,255,0.2)",
          boxShadow: "0 0 30px rgba(0,212,255,0.05)"
        }}>
          <h2 className="font-[family-name:var(--font-exo2)] text-xl font-bold text-[#00D4FF] flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            Quiz Details
          </h2>
          <input
            type="text"
            placeholder="Quiz Title *"
            className="w-full p-3.5 rounded-lg bg-[#161638] text-[#EEF2FF] placeholder-[#6B7280] border border-[#161638] focus:border-[#00D4FF]/50 focus:outline-none focus:ring-0 transition-colors font-[family-name:var(--font-rajdhani)] text-lg font-medium"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Host Password (optional)"
              className="w-full p-3.5 rounded-lg bg-[#161638] text-[#EEF2FF] placeholder-[#6B7280] border border-[#161638] focus:border-[#9B5DE5]/50 focus:outline-none transition-colors font-[family-name:var(--font-rajdhani)] text-base"
              value={hostPassword}
              onChange={e => setHostPassword(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <label className="text-[#6B7280] text-sm font-[family-name:var(--font-space-mono)] whitespace-nowrap">
                Secs/Q:
              </label>
              <input
                type="range" min={10} max={60} step={5} value={timePerQuestion}
                onChange={e => setTimePerQuestion(Number(e.target.value))}
                className="flex-1 accent-[#00D4FF]"
              />
              <span className="w-10 text-right font-[family-name:var(--font-space-mono)] text-[#00D4FF] font-bold">
                {timePerQuestion}s
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-[#6B7280] text-sm font-[family-name:var(--font-space-mono)] uppercase tracking-widest">
              Team Access
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTeamMode("none")}
                type="button"
                className="px-3 py-2 rounded-lg text-sm font-bold"
                style={{
                  border: `1px solid ${teamMode === "none" ? "rgba(0,212,255,0.45)" : "rgba(255,255,255,0.12)"}`,
                  color: teamMode === "none" ? "#00D4FF" : "#6B7280",
                  background: teamMode === "none" ? "rgba(0,212,255,0.12)" : "transparent",
                }}
              >
                No Team
              </button>
              <button
                onClick={() => setTeamMode("existing")}
                type="button"
                className="px-3 py-2 rounded-lg text-sm font-bold"
                style={{
                  border: `1px solid ${teamMode === "existing" ? "rgba(155,93,229,0.45)" : "rgba(255,255,255,0.12)"}`,
                  color: teamMode === "existing" ? "#9B5DE5" : "#6B7280",
                  background: teamMode === "existing" ? "rgba(155,93,229,0.12)" : "transparent",
                }}
              >
                Use Existing Team
              </button>
              <button
                onClick={() => setTeamMode("new")}
                type="button"
                className="px-3 py-2 rounded-lg text-sm font-bold"
                style={{
                  border: `1px solid ${teamMode === "new" ? "rgba(255,215,0,0.45)" : "rgba(255,255,255,0.12)"}`,
                  color: teamMode === "new" ? "#FFD700" : "#6B7280",
                  background: teamMode === "new" ? "rgba(255,215,0,0.12)" : "transparent",
                }}
              >
                Create New Team For This Quiz
              </button>
            </div>

            {teamMode === "existing" && (
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full p-3.5 rounded-lg bg-[#161638] text-[#EEF2FF] border border-[#161638] focus:border-[#9B5DE5]/45 outline-none"
              >
                <option value="">Select team...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            )}

            {teamMode === "new" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="New team name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full p-3.5 rounded-lg bg-[#161638] text-[#EEF2FF] border border-[#161638] focus:border-[#FFD700]/45 outline-none"
                />
                <input
                  type="text"
                  placeholder="Invite emails (comma separated)"
                  value={newTeamEmails}
                  onChange={(e) => setNewTeamEmails(e.target.value)}
                  className="w-full p-3.5 rounded-lg bg-[#161638] text-[#EEF2FF] border border-[#161638] focus:border-[#FFD700]/45 outline-none"
                />
              </div>
            )}
          </div>
        </section>

        {/* Section: AI Generator */}
        <section className="rounded-xl p-6 space-y-4" style={{
          background: "rgba(14,14,44,0.8)",
          border: "1px solid rgba(155,93,229,0.25)",
          boxShadow: "0 0 30px rgba(155,93,229,0.05)"
        }}>
          <h2 className="font-[family-name:var(--font-exo2)] text-xl font-bold text-[#9B5DE5] flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            AI Question Generator
          </h2>

          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm text-[#6B7280] font-[family-name:var(--font-space-mono)]">Difficulty:</span>
            {DIFFICULTY_OPTIONS.map(d => (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                className="px-4 py-1.5 rounded-full text-sm font-[family-name:var(--font-rajdhani)] font-bold uppercase tracking-wide transition-all"
                style={{
                  border: `1px solid ${difficulty === d.value ? d.color : 'rgba(255,255,255,0.1)'}`,
                  background: difficulty === d.value ? `${d.color}20` : 'transparent',
                  color: difficulty === d.value ? d.color : '#6B7280',
                }}
              >
                {d.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-[#6B7280] font-[family-name:var(--font-space-mono)]">Count:</span>
              {[3, 5, 10].map(n => (
                <button
                  key={n}
                  onClick={() => setGenCount(n)}
                  className="w-9 h-9 rounded font-[family-name:var(--font-exo2)] font-bold text-sm transition-all"
                  style={{
                    background: genCount === n ? 'rgba(155,93,229,0.2)' : 'rgba(22,22,56,0.8)',
                    border: `1px solid ${genCount === n ? '#9B5DE5' : 'rgba(255,255,255,0.08)'}`,
                    color: genCount === n ? '#9B5DE5' : '#6B7280',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Topic (e.g. 'Solar System', 'World War II', 'JavaScript')"
              className="flex-1 p-3.5 rounded-lg bg-[#161638] text-[#EEF2FF] placeholder-[#6B7280] border border-[#161638] focus:border-[#9B5DE5]/50 focus:outline-none transition-colors font-[family-name:var(--font-rajdhani)] text-base"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isGenerating && generateWithAI()}
            />
            <button
              onClick={generateWithAI}
              disabled={isGenerating || !topic.trim()}
              className="px-6 py-3.5 rounded-lg font-[family-name:var(--font-rajdhani)] font-bold text-sm uppercase tracking-wider text-[#07071A] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              style={{
                background: isGenerating ? '#6B7280' : 'linear-gradient(135deg, #9B5DE5, #7B3FC4)',
                boxShadow: isGenerating ? 'none' : '0 0 20px rgba(155,93,229,0.35)',
              }}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  Generating...
                </span>
              ) : (
                `Generate ${genCount} Qs`
              )}
            </button>
          </div>
        </section>

        {/* Section: Questions */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-[family-name:var(--font-exo2)] text-xl font-bold text-[#EEF2FF] flex items-center gap-2">
              Questions
              <span className="px-2 py-0.5 rounded-full text-sm font-[family-name:var(--font-space-mono)] text-[#00D4FF] bg-[#00D4FF]/10 border border-[#00D4FF]/20">
                {questions.length}
              </span>
            </h2>
            <button
              onClick={handleManualAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-[family-name:var(--font-rajdhani)] font-bold text-sm uppercase tracking-wide text-[#00D4FF] transition-all hover:bg-[#00D4FF]/10"
              style={{ border: "1px solid rgba(0,212,255,0.3)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Manually
            </button>
          </div>

          {questions.length === 0 && (
            <div className="rounded-xl p-12 text-center" style={{
              background: "rgba(14,14,44,0.5)",
              border: "1px dashed rgba(107,114,128,0.3)"
            }}>
              <div className="text-5xl mb-4">🎯</div>
              <p className="text-[#6B7280] font-[family-name:var(--font-rajdhani)] text-lg">
                No questions yet. Generate with AI or add manually.
              </p>
            </div>
          )}

          {questions.map((q, i) => {
            const isExpanded = expandedQ === q.id;
            return (
              <div
                key={q.id}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  background: "rgba(14,14,44,0.9)",
                  border: `1px solid ${isExpanded ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {/* Question header */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/2 transition-colors"
                  onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                >
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-[family-name:var(--font-exo2)] font-bold shrink-0"
                    style={{ background: "rgba(0,212,255,0.1)", color: "#00D4FF", border: "1px solid rgba(0,212,255,0.2)" }}>
                    {i + 1}
                  </span>
                  <span className="flex-1 font-[family-name:var(--font-rajdhani)] font-medium text-[#EEF2FF] truncate">
                    {q.text || <span className="text-[#6B7280] italic">Untitled question</span>}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); moveQuestion(q.id, 'up'); }}
                      disabled={i === 0}
                      className="p-1.5 rounded text-[#6B7280] hover:text-[#00D4FF] disabled:opacity-20 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); moveQuestion(q.id, 'down'); }}
                      disabled={i === questions.length - 1}
                      className="p-1.5 rounded text-[#6B7280] hover:text-[#00D4FF] disabled:opacity-20 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); removeQuestion(q.id); }}
                      className="p-1.5 rounded text-[#6B7280] hover:text-[#FF3366] transition-colors ml-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`ml-1 text-[#6B7280] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                {/* Question edit form */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
                    <textarea
                      placeholder="Question text *"
                      rows={2}
                      className="w-full p-3 rounded-lg bg-[#161638] text-[#EEF2FF] placeholder-[#6B7280] border border-[#161638] focus:border-[#00D4FF]/40 focus:outline-none transition-colors font-[family-name:var(--font-rajdhani)] text-base resize-none"
                      value={q.text}
                      onChange={e => updateQuestion(q.id, { text: e.target.value })}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt, optIndex) => {
                        const isCorrect = q.correctIndex === optIndex;
                        return (
                          <div
                            key={optIndex}
                            className="flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer"
                            style={{
                              background: isCorrect ? 'rgba(0,255,136,0.07)' : 'rgba(22,22,56,0.7)',
                              border: `1px solid ${isCorrect ? 'rgba(0,255,136,0.35)' : 'rgba(255,255,255,0.06)'}`,
                            }}
                            onClick={() => updateQuestion(q.id, { correctIndex: optIndex })}
                          >
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-[family-name:var(--font-exo2)] font-bold shrink-0 transition-all"
                              style={{
                                background: isCorrect ? '#00FF88' : 'rgba(107,114,128,0.2)',
                                color: isCorrect ? '#07071A' : '#6B7280',
                              }}
                            >
                              {OPTION_LABELS[optIndex]}
                            </div>
                            <input
                              type="text"
                              placeholder={`Option ${OPTION_LABELS[optIndex]} *`}
                              value={opt}
                              onClick={e => e.stopPropagation()}
                              onChange={e => updateOption(q.id, optIndex, e.target.value)}
                              className="flex-1 bg-transparent text-[#EEF2FF] placeholder-[#6B7280] focus:outline-none font-[family-name:var(--font-rajdhani)] text-sm"
                            />
                            {isCorrect && (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-[#6B7280] font-[family-name:var(--font-space-mono)]">
                      Click an option to mark it as correct
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>

      {/* Sticky launch bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4" style={{
        background: "rgba(7,7,26,0.95)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(0,212,255,0.15)",
      }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm font-[family-name:var(--font-space-mono)] text-[#6B7280]">
            {questions.length} question{questions.length !== 1 ? 's' : ''} · {timePerQuestion}s each
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleSaveDraft}
              disabled={isSaving || isLaunching || questions.length === 0 || !title.trim()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-[family-name:var(--font-rajdhani)] font-bold text-base uppercase tracking-wider text-[#00D4FF] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ border: "1px solid rgba(0,212,255,0.35)", background: "rgba(0,212,255,0.08)" }}
            >
              {isSaving ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={handleLaunch}
              disabled={isLaunching || isSaving || questions.length === 0 || !title.trim()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-3.5 rounded-lg font-[family-name:var(--font-exo2)] font-black text-lg uppercase tracking-wider text-[#07071A] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #00D4FF, #00B4D8)",
                boxShadow: isLaunching ? 'none' : '0 0 25px rgba(0,212,255,0.4)',
              }}
            >
              {isLaunching ? (
                <>
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  Launching...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Create & Start
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}