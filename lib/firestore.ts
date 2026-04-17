import { db } from "./firebase";
import {
  collection, doc, setDoc, getDoc, updateDoc, deleteDoc,
  query, where, getDocs, addDoc, serverTimestamp, limit, arrayUnion, writeBatch
} from "firebase/firestore";
import { Quiz, Session, Player, PlayerAnswer, Team, TeamInvite } from "./types";

export const generateJoinCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Quiz Functions
export const createQuiz = async (quizData: Omit<Quiz, "id" | "createdAt">): Promise<string> => {
  const docRef = await addDoc(collection(db, "quizzes"), {
    ...quizData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateQuiz = async (
  quizId: string,
  updates: Partial<Pick<Quiz, "title" | "hostPassword" | "questions" | "settings" | "teamId" | "teamName">>
): Promise<void> => {
  await updateDoc(doc(db, "quizzes", quizId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const getQuizzesByTeamIds = async (teamIds: string[]): Promise<Quiz[]> => {
  if (teamIds.length === 0) return [];

  const tasks = teamIds.map(async (teamId) => {
    const q = query(collection(db, "quizzes"), where("teamId", "==", teamId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Quiz));
  });

  const groups = await Promise.all(tasks);
  const all = groups.flat();
  const dedup = new Map<string, Quiz>();
  all.forEach((quiz) => dedup.set(quiz.id, quiz));

  return Array.from(dedup.values()).sort((a, b) => {
    const aMs = a.createdAt?.toMillis?.() || 0;
    const bMs = b.createdAt?.toMillis?.() || 0;
    return bMs - aMs;
  });
};

export const getManagedQuizzes = async (userId: string): Promise<Quiz[]> => {
  const [owned, teams] = await Promise.all([
    getOwnerQuizzes(userId),
    getUserTeams(userId),
  ]);

  const teamIds = teams.map((t) => t.id);
  const teamQuizzes = await getQuizzesByTeamIds(teamIds);

  const byId = new Map<string, Quiz>();
  [...owned, ...teamQuizzes].forEach((quiz) => byId.set(quiz.id, quiz));
  return Array.from(byId.values()).sort((a, b) => {
    const aMs = a.createdAt?.toMillis?.() || 0;
    const bMs = b.createdAt?.toMillis?.() || 0;
    return bMs - aMs;
  });
};

export const getOwnerQuizzes = async (ownerId: string): Promise<Quiz[]> => {
  const q = query(collection(db, "quizzes"), where("ownerId", "==", ownerId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as Quiz))
    .sort((a, b) => {
      const aMs = a.createdAt?.toMillis?.() || 0;
      const bMs = b.createdAt?.toMillis?.() || 0;
      return bMs - aMs;
    });
};

export const deleteQuizIfNotStarted = async (quizId: string): Promise<void> => {
  const sessionQ = query(collection(db, "sessions"), where("quizId", "==", quizId), limit(1));
  const sessionSnap = await getDocs(sessionQ);
  if (!sessionSnap.empty) {
    throw new Error("Cannot delete a quiz that has already been started.");
  }
  await deleteDoc(doc(db, "quizzes", quizId));
};

export const getQuiz = async (quizId: string): Promise<Quiz | null> => {
  const docRef = doc(db, "quizzes", quizId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Quiz;
};

// Session Functions
export const createSession = async (
  quizId: string,
  autoAdvance: boolean,
  ownerId?: string,
  teamId?: string | null,
): Promise<string> => {
  const joinCode = generateJoinCode();
  const sessionData = {
    quizId,
    ownerId: ownerId || null,
    teamId: teamId || null,
    joinCode,
    status: 'lobby' as const,
    currentQuestionIndex: -1,
    answerRevealed: false,
    showAnswerCounts: false,
    questionStartedAt: null,
    autoAdvance,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, "sessions"), sessionData);
  return docRef.id;
};

export const getSessionByJoinCode = async (joinCode: string): Promise<Session | null> => {
  const q = query(
    collection(db, "sessions"),
    where("joinCode", "==", joinCode.toUpperCase().trim()),
    limit(1)
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  const sessionDoc = querySnapshot.docs[0];
  return { id: sessionDoc.id, ...sessionDoc.data() } as Session;
};

export const getLatestSessionForQuiz = async (quizId: string): Promise<Session | null> => {
  const q = query(
    collection(db, "sessions"),
    where("quizId", "==", quizId),
    limit(25)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const sorted = snapshot.docs.sort((a, b) => {
    const aMs = (a.data().createdAt?.toMillis?.() || 0);
    const bMs = (b.data().createdAt?.toMillis?.() || 0);
    return bMs - aMs;
  });
  const d = sorted[0];
  return { id: d.id, ...d.data() } as Session;
};

export const getOwnerSessions = async (ownerId: string): Promise<Session[]> => {
  const q = query(
    collection(db, "sessions"),
    where("ownerId", "==", ownerId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as Session))
    .sort((a, b) => {
      const aMs = a.createdAt?.toMillis?.() || 0;
      const bMs = b.createdAt?.toMillis?.() || 0;
      return bMs - aMs;
    });
};

export const getSessionsByTeamIds = async (teamIds: string[]): Promise<Session[]> => {
  if (teamIds.length === 0) return [];

  const tasks = teamIds.map(async (teamId) => {
    const q = query(collection(db, "sessions"), where("teamId", "==", teamId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Session));
  });

  const groups = await Promise.all(tasks);
  const all = groups.flat();
  const dedup = new Map<string, Session>();
  all.forEach((session) => dedup.set(session.id, session));
  return Array.from(dedup.values()).sort((a, b) => {
    const aMs = a.createdAt?.toMillis?.() || 0;
    const bMs = b.createdAt?.toMillis?.() || 0;
    return bMs - aMs;
  });
};

export const getManagedSessions = async (userId: string): Promise<Session[]> => {
  const [owned, teams] = await Promise.all([
    getOwnerSessions(userId),
    getUserTeams(userId),
  ]);
  const teamIds = teams.map((t) => t.id);
  const teamSessions = await getSessionsByTeamIds(teamIds);
  const byId = new Map<string, Session>();
  [...owned, ...teamSessions].forEach((session) => byId.set(session.id, session));
  return Array.from(byId.values()).sort((a, b) => {
    const aMs = a.createdAt?.toMillis?.() || 0;
    const bMs = b.createdAt?.toMillis?.() || 0;
    return bMs - aMs;
  });
};

// Team functions
export const createTeam = async (
  name: string,
  ownerId: string,
  ownerEmail: string,
  memberEmails: string[] = [],
): Promise<string> => {
  const normalizedMembers = Array.from(
    new Set(
      memberEmails
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email && email !== ownerEmail.toLowerCase())
    )
  );

  const teamRef = await addDoc(collection(db, "teams"), {
    name: name.trim(),
    ownerId,
    ownerEmail: ownerEmail.toLowerCase(),
    lastAcceptedInviteId: null,
    members: [{ uid: ownerId, email: ownerEmail.toLowerCase(), role: "owner", joinedAt: serverTimestamp() }],
    memberIds: [ownerId],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (normalizedMembers.length > 0) {
    const invites = normalizedMembers.map((invitedEmail) =>
      addDoc(collection(db, "teamInvites"), {
        teamId: teamRef.id,
        teamName: name.trim(),
        invitedEmail,
        invitedById: ownerId,
        invitedByEmail: ownerEmail.toLowerCase(),
        status: "pending",
        createdAt: serverTimestamp(),
      })
    );
    await Promise.all(invites);
  }

  return teamRef.id;
};

export const inviteTeamMembers = async (
  teamId: string,
  teamName: string,
  invitedById: string,
  invitedByEmail: string,
  memberEmails: string[]
): Promise<void> => {
  const normalized = Array.from(
    new Set(
      memberEmails.map((e) => e.trim().toLowerCase()).filter((e) => !!e)
    )
  );

  const tasks = normalized.map((invitedEmail) =>
    addDoc(collection(db, "teamInvites"), {
      teamId,
      teamName,
      invitedEmail,
      invitedById,
      invitedByEmail: invitedByEmail.toLowerCase(),
      status: "pending",
      createdAt: serverTimestamp(),
    })
  );
  await Promise.all(tasks);
};

export const getTeam = async (teamId: string): Promise<Team | null> => {
  const snap = await getDoc(doc(db, "teams", teamId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Team;
};

export const getUserTeams = async (userId: string): Promise<Team[]> => {
  const q = query(collection(db, "teams"), where("memberIds", "array-contains", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as Team))
    .sort((a, b) => {
      const aMs = a.createdAt?.toMillis?.() || 0;
      const bMs = b.createdAt?.toMillis?.() || 0;
      return bMs - aMs;
    });
};

export const getPendingTeamInvitesByEmail = async (email: string): Promise<TeamInvite[]> => {
  const normalized = email.trim().toLowerCase();
  const q = query(collection(db, "teamInvites"), where("invitedEmail", "==", normalized));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as TeamInvite))
    .filter((invite) => invite.status === "pending")
    .sort((a, b) => {
      const aMs = a.createdAt?.toMillis?.() || 0;
      const bMs = b.createdAt?.toMillis?.() || 0;
      return bMs - aMs;
    });
};

export const acceptTeamInvite = async (
  inviteId: string,
  userId: string,
  userEmail: string,
): Promise<void> => {
  const inviteRef = doc(db, "teamInvites", inviteId);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) throw new Error("Invite no longer exists.");

  const invite = inviteSnap.data() as TeamInvite;
  if (invite.status !== "pending") throw new Error("Invite is no longer pending.");

  const teamRef = doc(db, "teams", invite.teamId);
  const batch = writeBatch(db);
  batch.update(inviteRef, {
    status: "accepted",
    respondedAt: serverTimestamp(),
  });
  batch.update(teamRef, {
    memberIds: arrayUnion(userId),
    members: arrayUnion({ uid: userId, email: userEmail.toLowerCase(), role: "member", joinedAt: new Date().toISOString() }),
    lastAcceptedInviteId: inviteId,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
};

export const declineTeamInvite = async (inviteId: string): Promise<void> => {
  const inviteRef = doc(db, "teamInvites", inviteId);
  await updateDoc(inviteRef, {
    status: "declined",
    respondedAt: serverTimestamp(),
  });
};

export const canUserManageSession = async (sessionId: string, userId: string): Promise<boolean> => {
  const sessionSnap = await getDoc(doc(db, "sessions", sessionId));
  if (!sessionSnap.exists()) return false;
  const session = { id: sessionSnap.id, ...sessionSnap.data() } as Session;

  if (session.ownerId === userId) return true;
  if (!session.teamId) return false;

  const teamSnap = await getDoc(doc(db, "teams", session.teamId));
  if (!teamSnap.exists()) return false;
  const team = teamSnap.data() as Team;
  return (team.memberIds || []).includes(userId);
};

export const canUserManageQuiz = async (quizId: string, userId: string): Promise<boolean> => {
  const quizSnap = await getDoc(doc(db, "quizzes", quizId));
  if (!quizSnap.exists()) return false;

  const quiz = { id: quizSnap.id, ...quizSnap.data() } as Quiz;
  if (quiz.ownerId === userId) return true;
  if (!quiz.teamId) return false;

  const teamSnap = await getDoc(doc(db, "teams", quiz.teamId));
  if (!teamSnap.exists()) return false;
  const team = teamSnap.data() as Team;
  return (team.memberIds || []).includes(userId);
};

export const joinSession = async (sessionId: string, playerId: string, playerName: string): Promise<void> => {
  const playerRef = doc(db, "sessions", sessionId, "players", playerId);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) {
    await setDoc(playerRef, {
      name: playerName.trim(),
      joinedAt: serverTimestamp(),
      totalScore: 0,
      avgResponseTime: 0,
      answers: [],
    });
  }
};

export const updateSessionStatus = async (sessionId: string, status: Session['status']): Promise<void> => {
  await updateDoc(doc(db, "sessions", sessionId), { status });
};

export const startSession = async (sessionId: string): Promise<void> => {
  await updateDoc(doc(db, "sessions", sessionId), {
    status: 'active',
    currentQuestionIndex: 0,
    answerRevealed: false,
    questionStartedAt: serverTimestamp(),
  });
};

export const updateAnswerCountVisibility = async (sessionId: string, showAnswerCounts: boolean): Promise<void> => {
  await updateDoc(doc(db, "sessions", sessionId), { showAnswerCounts });
};

export const advanceQuestion = async (sessionId: string, newIndex: number): Promise<void> => {
  await updateDoc(doc(db, "sessions", sessionId), {
    currentQuestionIndex: newIndex,
    answerRevealed: false,
    questionStartedAt: serverTimestamp(),
  });
};

export const revealAnswer = async (sessionId: string): Promise<void> => {
  await updateDoc(doc(db, "sessions", sessionId), { answerRevealed: true });
};

export const submitAnswer = async (
  sessionId: string,
  playerId: string,
  answer: PlayerAnswer,
  currentAnswers: PlayerAnswer[]
): Promise<void> => {
  // Prevent duplicate answers for same question
  const alreadyAnswered = currentAnswers.some(a => a.questionIndex === answer.questionIndex);
  if (alreadyAnswered) return;

  const playerRef = doc(db, "sessions", sessionId, "players", playerId);
  const newAnswers = [...currentAnswers, answer];
  const totalScore = newAnswers.reduce((acc, curr) => acc + curr.score, 0);
  const correctAnswers = newAnswers.filter(a => a.isCorrect);
  const avgResponseTime = correctAnswers.length > 0
    ? correctAnswers.reduce((acc, curr) => acc + curr.responseTimeMs, 0) / correctAnswers.length
    : 0;

  await updateDoc(playerRef, {
    answers: newAnswers,
    totalScore,
    avgResponseTime,
  });
};