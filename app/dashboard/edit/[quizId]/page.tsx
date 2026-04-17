"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizerAuthGuard } from "@/hooks/useOrganizerAuthGuard";
import { canUserManageQuiz, getLatestSessionForQuiz, getQuiz, updateQuiz } from "@/lib/firestore";
import { Question } from "@/lib/types";

export default function EditQuizPage({ params }: { params: { quizId: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { loading: guardLoading, isOrganizerAuthenticated } = useOrganizerAuthGuard("/auth");
  const { quizId } = params;

  const [title, setTitle] = useState("");
  const [hostPassword, setHostPassword] = useState("");
  const [timePerQuestion, setTimePerQuestion] = useState(20);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!user || user.isAnonymous) return;
      setLoading(true);
      setError("");
      try {
        const [quiz, latestSession] = await Promise.all([
          getQuiz(quizId),
          getLatestSessionForQuiz(quizId),
        ]);

        if (!quiz) throw new Error("Quiz not found.");
        const canManage = await canUserManageQuiz(quizId, user.uid);
        if (!canManage) throw new Error("You cannot edit this quiz.");
        if (latestSession) throw new Error("Quiz already started and can no longer be edited.");

        if (!isMounted) return;
        setTitle(quiz.title);
        setHostPassword(quiz.hostPassword || "");
        setTimePerQuestion(quiz.settings.timePerQuestion || 20);
        setQuestions(quiz.questions || []);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message || "Failed to load quiz.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [quizId, user]);

  const canSave = useMemo(() => {
    if (!title.trim() || questions.length === 0) return false;
    const incomplete = questions.some((q) => !q.text.trim() || q.options.some((o) => !o.trim()));
    return !incomplete;
  }, [title, questions]);

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const updateOption = (qId: string, idx: number, value: string) => {
    setQuestions((prev) => prev.map((q) => {
      if (q.id !== qId) return q;
      const next = [...q.options];
      next[idx] = value;
      return { ...q, options: next };
    }));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, {
      id: crypto.randomUUID(),
      text: "",
      options: ["", "", "", ""],
      correctIndex: 0,
    }]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      await updateQuiz(quizId, {
        title: title.trim(),
        hostPassword: hostPassword.trim(),
        settings: { timePerQuestion, autoAdvance: false, autoReveal: false },
        questions,
      });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Failed to save quiz.");
    } finally {
      setSaving(false);
    }
  };

  if (guardLoading || !isOrganizerAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-[#07071A] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#07071A] p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <h1 className="font-[family-name:var(--font-exo2)] text-3xl font-black text-[#00D4FF]">Edit Quiz</h1>
          <button onClick={() => router.push("/dashboard")} className="px-3 py-2 rounded-lg border border-[#6B7280]/35 text-[#6B7280]">Back</button>
        </div>

        {error && <div className="rounded-lg border border-[#FF3366]/35 bg-[#FF3366]/10 p-3 text-[#FF3366]">{error}</div>}

        <section className="rounded-xl p-4 border border-white/10 bg-white/5 space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" className="w-full p-3 rounded-lg bg-[#161638] border border-[#161638] focus:border-[#00D4FF]/40 outline-none" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={hostPassword} onChange={(e) => setHostPassword(e.target.value)} placeholder="Host password (optional)" className="w-full p-3 rounded-lg bg-[#161638] border border-[#161638] focus:border-[#9B5DE5]/40 outline-none" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#6B7280]">Seconds per question</span>
              <input type="range" min={10} max={60} step={5} value={timePerQuestion} onChange={(e) => setTimePerQuestion(Number(e.target.value))} className="flex-1 accent-[#00D4FF]" />
              <span className="w-10 text-right text-[#00D4FF]">{timePerQuestion}s</span>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-[family-name:var(--font-exo2)] text-xl font-bold">Questions ({questions.length})</h2>
            <button onClick={addQuestion} className="px-3 py-2 rounded-lg border border-[#00D4FF]/35 text-[#00D4FF]">Add Question</button>
          </div>

          {questions.map((q, idx) => (
            <div key={q.id} className="rounded-xl p-4 border border-white/10 bg-white/5 space-y-3">
              <div className="flex justify-between items-center">
                <p className="font-[family-name:var(--font-space-mono)] text-xs text-[#6B7280]">Question {idx + 1}</p>
                <button onClick={() => removeQuestion(q.id)} className="text-xs text-[#FF3366]">Remove</button>
              </div>
              <textarea value={q.text} onChange={(e) => updateQuestion(q.id, { text: e.target.value })} rows={2} placeholder="Question text" className="w-full p-3 rounded-lg bg-[#161638] border border-[#161638] focus:border-[#00D4FF]/40 outline-none" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((opt, optIdx) => (
                  <button key={optIdx} onClick={() => updateQuestion(q.id, { correctIndex: optIdx })} className="text-left rounded-lg p-2 border" style={{ borderColor: q.correctIndex === optIdx ? "rgba(0,255,136,0.45)" : "rgba(255,255,255,0.1)", background: q.correctIndex === optIdx ? "rgba(0,255,136,0.08)" : "rgba(22,22,56,0.8)" }}>
                    <input value={opt} onChange={(e) => updateOption(q.id, optIdx, e.target.value)} placeholder={`Option ${optIdx + 1}`} className="w-full bg-transparent outline-none" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="flex justify-end">
          <button onClick={handleSave} disabled={!canSave || saving} className="px-6 py-3 rounded-lg text-[#07071A] font-bold disabled:opacity-45" style={{ background: "linear-gradient(135deg, #00D4FF, #00B4D8)" }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </main>
  );
}
