"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizerAuthGuard } from "@/hooks/useOrganizerAuthGuard";
import {
  acceptTeamInvite,
  createSession,
  createTeam,
  deleteQuizIfNotStarted,
  declineTeamInvite,
  getManagedQuizzes,
  getManagedSessions,
  getPendingTeamInvitesByEmail,
  getUserTeams,
  inviteTeamMembers,
} from "@/lib/firestore";
import { Quiz, Session, Team, TeamInvite } from "@/lib/types";

type QuizWithLatest = {
  quiz: Quiz;
  latestSession: Session | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { loading: guardLoading, isOrganizerAuthenticated } = useOrganizerAuthGuard("/auth");

  const [items, setItems] = useState<QuizWithLatest[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [pendingInvites, setPendingInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyQuizId, setBusyQuizId] = useState<string | null>(null);
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamInviteEmails, setTeamInviteEmails] = useState("");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [inviteEmailDrafts, setInviteEmailDrafts] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    if (!user || user.isAnonymous) return;

    setLoading(true);
    setError("");

    try {
      const [quizzes, sessions, userTeams, invites] = await Promise.all([
        getManagedQuizzes(user.uid),
        getManagedSessions(user.uid),
        getUserTeams(user.uid),
        getPendingTeamInvitesByEmail(user.email || ""),
      ]);

      const latestByQuiz = new Map<string, Session>();
      sessions.forEach((session) => {
        const existing = latestByQuiz.get(session.quizId);
        const existingMs = existing?.createdAt?.toMillis?.() || 0;
        const currentMs = session.createdAt?.toMillis?.() || 0;
        if (!existing || currentMs > existingMs) {
          latestByQuiz.set(session.quizId, session);
        }
      });

      setItems(quizzes.map((quiz) => ({ quiz, latestSession: latestByQuiz.get(quiz.id) || null })));
      setTeams(userTeams);
      setPendingInvites(invites);
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !user.isAnonymous) {
      loadData();
    }
  }, [user, loadData]);

  const counts = useMemo(() => {
    let drafts = 0;
    let live = 0;
    let completed = 0;

    items.forEach((item) => {
      if (!item.latestSession) drafts++;
      else if (item.latestSession.status === "ended") completed++;
      else live++;
    });

    return { drafts, live, completed };
  }, [items]);

  const handleStartQuiz = async (quizId: string, teamId?: string | null) => {
    if (!user || user.isAnonymous) return;
    setBusyQuizId(quizId);
    setError("");
    try {
      const sessionId = await createSession(quizId, false, user.uid, teamId || null);
      router.push(`/host/${sessionId}`);
    } catch (err: any) {
      setError(err?.message || "Failed to start quiz.");
    } finally {
      setBusyQuizId(null);
    }
  };

  const handleDeleteDraft = async (quizId: string) => {
    setBusyQuizId(quizId);
    setError("");
    try {
      await deleteQuizIfNotStarted(quizId);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to delete quiz.");
    } finally {
      setBusyQuizId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  const parseEmailList = (value: string) =>
    value
      .split(/[\n,;]/)
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v.length > 0);

  const handleCreateTeam = async () => {
    if (!user || user.isAnonymous || !user.email) return;
    if (!teamName.trim()) {
      setError("Team name is required.");
      return;
    }
    setError("");
    setIsCreatingTeam(true);
    try {
      const emails = parseEmailList(teamInviteEmails);
      await createTeam(teamName.trim(), user.uid, user.email, emails);
      setTeamName("");
      setTeamInviteEmails("");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to create team.");
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleInviteMore = async (team: Team) => {
    if (!user || user.isAnonymous || !user.email) return;
    const raw = inviteEmailDrafts[team.id] || "";
    const emails = parseEmailList(raw);
    if (emails.length === 0) return;

    setError("");
    try {
      await inviteTeamMembers(team.id, team.name, user.uid, user.email, emails);
      setInviteEmailDrafts((prev) => ({ ...prev, [team.id]: "" }));
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to invite team members.");
    }
  };

  const handleAcceptInvite = async (invite: TeamInvite) => {
    if (!user || user.isAnonymous || !user.email) return;
    setBusyInviteId(invite.id);
    setError("");
    try {
      await acceptTeamInvite(invite.id, user.uid, user.email);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to accept invite.");
    } finally {
      setBusyInviteId(null);
    }
  };

  const handleDeclineInvite = async (invite: TeamInvite) => {
    setBusyInviteId(invite.id);
    setError("");
    try {
      await declineTeamInvite(invite.id);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to decline invite.");
    } finally {
      setBusyInviteId(null);
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
    <main className="min-h-screen bg-[#07071A] relative overflow-hidden p-4 md:p-6">
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto space-y-6">
        <header className="rounded-xl p-5 flex flex-wrap items-center justify-between gap-4" style={{ background: "rgba(14,14,44,0.92)", border: "1px solid rgba(0,212,255,0.2)" }}>
          <div>
            <h1 className="font-[family-name:var(--font-exo2)] text-3xl font-black text-[#00D4FF]">Organizer Dashboard</h1>
            <p className="text-[#6B7280] font-[family-name:var(--font-rajdhani)]">{user?.email || "Organizer"}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/create" className="px-4 py-2.5 rounded-lg font-[family-name:var(--font-rajdhani)] font-bold text-[#07071A]" style={{ background: "linear-gradient(135deg, #00D4FF, #00B4D8)" }}>
              + New Quiz
            </Link>
            <button onClick={handleLogout} className="px-4 py-2.5 rounded-lg font-[family-name:var(--font-rajdhani)] font-bold text-[#FF3366] border border-[#FF3366]/35 hover:bg-[#FF3366]/10">
              Sign Out
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl p-4 border border-[#00D4FF]/20 bg-[#00D4FF]/8">
            <p className="text-xs font-[family-name:var(--font-space-mono)] text-[#6B7280] uppercase">Draft Quizzes</p>
            <p className="text-4xl font-[family-name:var(--font-exo2)] font-black text-[#00D4FF]">{counts.drafts}</p>
          </div>
          <div className="rounded-xl p-4 border border-[#FFD700]/20 bg-[#FFD700]/8">
            <p className="text-xs font-[family-name:var(--font-space-mono)] text-[#6B7280] uppercase">Live Quizzes</p>
            <p className="text-4xl font-[family-name:var(--font-exo2)] font-black text-[#FFD700]">{counts.live}</p>
          </div>
          <div className="rounded-xl p-4 border border-[#00FF88]/20 bg-[#00FF88]/8">
            <p className="text-xs font-[family-name:var(--font-space-mono)] text-[#6B7280] uppercase">Completed</p>
            <p className="text-4xl font-[family-name:var(--font-exo2)] font-black text-[#00FF88]">{counts.completed}</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg p-3 border border-[#FF3366]/35 bg-[#FF3366]/8 text-[#FF3366] font-[family-name:var(--font-rajdhani)] font-semibold">
            {error}
          </div>
        )}

        {pendingInvites.length > 0 && (
          <section className="rounded-xl p-5 border border-[#FFD700]/35 bg-[#FFD700]/8 space-y-3">
            <h2 className="font-[family-name:var(--font-exo2)] text-xl font-bold text-[#FFD700]">Team-up Requests</h2>
            {pendingInvites.map((invite) => {
              const busy = busyInviteId === invite.id;
              return (
                <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#FFD700]/25 bg-black/20 p-3">
                  <p className="text-sm text-[#EEF2FF]">
                    Join <span className="font-bold">{invite.teamName}</span> (invited by {invite.invitedByEmail})
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeclineInvite(invite)}
                      disabled={busy}
                      className="px-3 py-1.5 rounded border border-[#FF3366]/35 text-[#FF3366] disabled:opacity-45"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAcceptInvite(invite)}
                      disabled={busy}
                      className="px-3 py-1.5 rounded text-[#07071A] font-bold disabled:opacity-45"
                      style={{ background: "linear-gradient(135deg, #FFD700, #FFB800)" }}
                    >
                      {busy ? "Please wait..." : "Accept"}
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <section className="rounded-xl p-5 border border-[#9B5DE5]/30 bg-[#9B5DE5]/8 space-y-4">
          <h2 className="font-[family-name:var(--font-exo2)] text-xl font-bold text-[#9B5DE5]">Teams</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="New team name"
              className="w-full p-3 rounded-lg bg-[#161638] border border-[#161638] focus:border-[#9B5DE5]/50 outline-none"
            />
            <input
              value={teamInviteEmails}
              onChange={(e) => setTeamInviteEmails(e.target.value)}
              placeholder="Invite emails (comma separated)"
              className="w-full p-3 rounded-lg bg-[#161638] border border-[#161638] focus:border-[#9B5DE5]/50 outline-none md:col-span-2"
            />
            <button
              onClick={handleCreateTeam}
              disabled={isCreatingTeam || !teamName.trim()}
              className="px-4 py-2.5 rounded-lg text-[#07071A] font-bold disabled:opacity-45"
              style={{ background: "linear-gradient(135deg, #9B5DE5, #7B3FC4)" }}
            >
              {isCreatingTeam ? "Creating..." : "Create Team"}
            </button>
          </div>

          {teams.length === 0 ? (
            <p className="text-[#6B7280] text-sm">No teams yet. Create one and invite members by email.</p>
          ) : (
            <div className="space-y-3">
              {teams.map((team) => (
                <div key={team.id} className="rounded-lg border border-white/10 p-3 bg-black/20 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-[family-name:var(--font-rajdhani)] text-lg font-bold text-[#EEF2FF]">{team.name}</p>
                    <p className="text-xs text-[#6B7280]">{team.members?.length || 0} member(s)</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={inviteEmailDrafts[team.id] || ""}
                      onChange={(e) => setInviteEmailDrafts((prev) => ({ ...prev, [team.id]: e.target.value }))}
                      placeholder="Add more members: email1, email2"
                      className="w-full p-2.5 rounded bg-[#161638] border border-[#161638] focus:border-[#9B5DE5]/45 outline-none"
                    />
                    <button
                      onClick={() => handleInviteMore(team)}
                      className="px-3 py-2 rounded border border-[#9B5DE5]/40 text-[#9B5DE5] font-semibold"
                    >
                      Invite
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          {items.length === 0 && (
            <div className="rounded-xl p-10 text-center border border-white/10 bg-white/5">
              <p className="text-[#6B7280] font-[family-name:var(--font-rajdhani)] text-lg">No quizzes yet. Create your first one.</p>
            </div>
          )}

          {items.map(({ quiz, latestSession }) => {
            const isDraft = !latestSession;
            const isLive = !!latestSession && latestSession.status !== "ended";
            const isCompleted = !!latestSession && latestSession.status === "ended";
            const isBusy = busyQuizId === quiz.id;

            return (
              <div key={quiz.id} className="rounded-xl p-5 border bg-[#0E0E2C]" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-[family-name:var(--font-exo2)] text-2xl font-bold text-[#EEF2FF]">{quiz.title}</h2>
                    <p className="text-xs font-[family-name:var(--font-space-mono)] text-[#6B7280] mt-1">
                      {quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""} · {quiz.settings.timePerQuestion}s each
                    </p>
                    {quiz.teamName && (
                      <p className="text-xs text-[#9B5DE5] mt-1 font-[family-name:var(--font-space-mono)] uppercase tracking-wider">
                        Team: {quiz.teamName}
                      </p>
                    )}
                    <p className="text-xs mt-2 uppercase tracking-wider font-[family-name:var(--font-space-mono)]" style={{ color: isDraft ? "#00D4FF" : isLive ? "#FFD700" : "#00FF88" }}>
                      {isDraft ? "Draft" : isLive ? `Live (${latestSession?.status})` : "Completed"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isDraft && (
                      <>
                        <Link href={`/dashboard/edit/${quiz.id}`} className="px-3 py-2 rounded-lg border border-[#9B5DE5]/35 text-[#9B5DE5] font-[family-name:var(--font-rajdhani)] font-bold hover:bg-[#9B5DE5]/10">
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteDraft(quiz.id)}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-lg border border-[#FF3366]/35 text-[#FF3366] font-[family-name:var(--font-rajdhani)] font-bold hover:bg-[#FF3366]/10 disabled:opacity-45"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => handleStartQuiz(quiz.id, quiz.teamId || null)}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-lg text-[#07071A] font-[family-name:var(--font-rajdhani)] font-bold disabled:opacity-45"
                          style={{ background: "linear-gradient(135deg, #00D4FF, #00B4D8)" }}
                        >
                          {isBusy ? "Starting..." : "Start Quiz"}
                        </button>
                      </>
                    )}

                    {isLive && latestSession && (
                      <Link href={`/host/${latestSession.id}`} className="px-3 py-2 rounded-lg text-[#07071A] font-[family-name:var(--font-rajdhani)] font-bold" style={{ background: "linear-gradient(135deg, #FFD700, #FFB800)" }}>
                        Open Host Panel
                      </Link>
                    )}

                    {isCompleted && latestSession && (
                      <>
                        <Link href={`/results/${latestSession.id}`} className="px-3 py-2 rounded-lg border border-[#00FF88]/35 text-[#00FF88] font-[family-name:var(--font-rajdhani)] font-bold hover:bg-[#00FF88]/10">
                          View Results & Report
                        </Link>
                        <button
                          onClick={() => handleStartQuiz(quiz.id, quiz.teamId || null)}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-lg text-[#07071A] font-[family-name:var(--font-rajdhani)] font-bold disabled:opacity-45"
                          style={{ background: "linear-gradient(135deg, #00D4FF, #00B4D8)" }}
                        >
                          {isBusy ? "Starting..." : "Run Again"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
