"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type AuthMode = "signin" | "signup";

function mapAuthError(err: any): string {
  const code = err?.code || "";

  if (code === "auth/operation-not-allowed") {
    return "This sign-in method is not enabled in Firebase. Enable Email/Password in Firebase Console -> Authentication -> Sign-in method.";
  }
  if (code === "auth/invalid-credential") {
    return "Invalid email or password.";
  }
  if (code === "auth/user-not-found") {
    return "No account found for this email.";
  }
  if (code === "auth/email-already-in-use") {
    return "This email is already registered. Try signing in instead.";
  }
  if (code === "auth/weak-password") {
    return "Password is too weak. Use at least 6 characters.";
  }
  if (code === "auth/popup-closed-by-user") {
    return "Google sign-in popup was closed before completing login.";
  }

  return err?.message || "Authentication failed.";
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, isOrganizerAuthenticated, signIn, signUp, signInWithGoogle } = useAuth();

  const initialMode = useMemo<AuthMode>(() => {
    return searchParams.get("mode") === "signup" ? "signup" : "signin";
  }, [searchParams]);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isOrganizerAuthenticated && user && !user.isAnonymous) {
      router.replace("/dashboard");
    }
  }, [loading, isOrganizerAuthenticated, user, router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        await signUp(normalizedEmail, password);
      } else {
        await signIn(normalizedEmail, password);
      }
      router.replace("/dashboard");
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07071A] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#07071A] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 grid-bg opacity-25 pointer-events-none" />
      <div className="absolute w-[720px] h-[720px] rounded-full bg-[#00D4FF]/8 blur-[130px] pointer-events-none" />

      <div className="w-full max-w-md rounded-2xl p-8 space-y-6 z-10" style={{
        background: "rgba(14,14,44,0.92)",
        border: "1px solid rgba(0,212,255,0.22)",
        boxShadow: "0 0 40px rgba(0,212,255,0.08)",
      }}>
        <div className="text-center space-y-2">
          <h1 className="font-[family-name:var(--font-exo2)] text-3xl font-black text-[#00D4FF]">Login</h1>
          <p className="text-[#6B7280] font-[family-name:var(--font-rajdhani)]">Create and manage your quizzes securely</p>
        </div>

        <div className="flex rounded-lg overflow-hidden border border-[#161638]">
          <button
            onClick={() => setMode("signin")}
            className="flex-1 py-2.5 text-sm font-[family-name:var(--font-space-mono)] uppercase tracking-widest transition-colors"
            style={{ background: mode === "signin" ? "rgba(0,212,255,0.16)" : "rgba(22,22,56,0.9)", color: mode === "signin" ? "#00D4FF" : "#6B7280" }}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("signup")}
            className="flex-1 py-2.5 text-sm font-[family-name:var(--font-space-mono)] uppercase tracking-widest transition-colors"
            style={{ background: mode === "signup" ? "rgba(155,93,229,0.16)" : "rgba(22,22,56,0.9)", color: mode === "signup" ? "#9B5DE5" : "#6B7280" }}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="text-sm font-[family-name:var(--font-rajdhani)] font-semibold text-[#FF3366] rounded-lg p-3 border border-[#FF3366]/35 bg-[#FF3366]/8">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3.5 rounded-lg bg-[#161638] text-[#EEF2FF] placeholder-[#6B7280] border border-[#161638] focus:border-[#00D4FF]/45 focus:outline-none font-[family-name:var(--font-rajdhani)]"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3.5 rounded-lg bg-[#161638] text-[#EEF2FF] placeholder-[#6B7280] border border-[#161638] focus:border-[#00D4FF]/45 focus:outline-none font-[family-name:var(--font-rajdhani)]"
            required
          />
          {mode === "signup" && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3.5 rounded-lg bg-[#161638] text-[#EEF2FF] placeholder-[#6B7280] border border-[#161638] focus:border-[#9B5DE5]/45 focus:outline-none font-[family-name:var(--font-rajdhani)]"
              required
            />
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-lg font-[family-name:var(--font-exo2)] font-black uppercase tracking-wider text-[#07071A] disabled:opacity-45"
            style={{ background: "linear-gradient(135deg, #00D4FF, #00B4D8)" }}
          >
            {isSubmitting ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="relative">
          <div className="h-px bg-white/10" />
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 bg-[#0E0E2C] text-xs text-[#6B7280] font-[family-name:var(--font-space-mono)]">OR</span>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-colors font-[family-name:var(--font-rajdhani)] font-bold text-[#EEF2FF] disabled:opacity-45 flex items-center justify-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21.6 12.23c0-.72-.06-1.41-.2-2.07H12v3.92h5.4a4.86 4.86 0 0 1-2 3.2v2.66h3.24c1.9-1.75 2.96-4.33 2.96-7.71Z" fill="white" fillOpacity="0.92"/>
            <path d="M12 22c2.7 0 4.97-.9 6.63-2.46l-3.24-2.66c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.75-5.58-4.1H3.08v2.75A10 10 0 0 0 12 22Z" fill="white" fillOpacity="0.78"/>
            <path d="M6.42 13.74A5.98 5.98 0 0 1 6.1 12c0-.6.1-1.18.32-1.74V7.5H3.08A10 10 0 0 0 2 12c0 1.62.39 3.15 1.08 4.5l3.34-2.76Z" fill="white" fillOpacity="0.62"/>
            <path d="M12 6.16c1.47 0 2.78.5 3.82 1.47l2.86-2.86C16.97 3.18 14.7 2 12 2 8.08 2 4.7 4.24 3.08 7.5l3.34 2.76c.78-2.35 2.98-4.1 5.58-4.1Z" fill="white"/>
          </svg>
          Continue With Google
        </button>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#07071A] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
