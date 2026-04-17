import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden bg-[#07071A]">
      {/* Background effects */}
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-[#9B5DE5]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#00D4FF]/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#FF3366]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Corner decorations */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-[#00D4FF]/30 rounded-tl-sm" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-[#00D4FF]/30 rounded-tr-sm" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-[#00D4FF]/30 rounded-bl-sm" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-[#00D4FF]/30 rounded-br-sm" />

      <div className="text-center z-10 space-y-6 max-w-4xl">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#9B5DE5]/40 bg-[#9B5DE5]/10 text-[#9B5DE5] text-sm font-[family-name:var(--font-space-mono)] mb-4">
          <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
          AI-Powered Live Quiz Platform
        </div>

        {/* Main title */}
        <h1 className="font-[family-name:var(--font-exo2)] text-7xl md:text-9xl font-black tracking-tighter leading-none">
          <span
            className="block text-[#00D4FF]"
            style={{ textShadow: "0 0 30px rgba(0,212,255,0.6), 0 0 60px rgba(0,212,255,0.3)" }}
          >
            QUIZ
          </span>
          <span
            className="block text-[#9B5DE5]"
            style={{ textShadow: "0 0 30px rgba(155,93,229,0.6), 0 0 60px rgba(155,93,229,0.3)" }}
          >
            BLITZ
          </span>
        </h1>

        {/* Tagline */}
        <p className="font-[family-name:var(--font-rajdhani)] text-xl md:text-2xl text-[#6B7280] max-w-2xl mx-auto leading-relaxed font-medium">
          Real-time multiplayer quizzes with AI generation. For classrooms, events, and teams.
        </p>

        {/* Stats row */}
        <div className="flex justify-center gap-8 md:gap-16 py-4">
          {[
            { value: "Live", label: "Real-time" },
            { value: "AI", label: "Generated" },
            { value: "∞", label: "Players" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-[family-name:var(--font-exo2)] text-3xl font-black text-[#00D4FF]"
                style={{ textShadow: "0 0 15px rgba(0,212,255,0.5)" }}>
                {stat.value}
              </div>
              <div className="text-xs text-[#6B7280] uppercase tracking-widest mt-1 font-[family-name:var(--font-space-mono)]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
          <Link
            href="/join"
            className="group relative px-10 py-5 font-[family-name:var(--font-rajdhani)] font-bold text-xl uppercase tracking-widest rounded text-[#07071A] transition-all duration-300 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #00D4FF, #00B4D8)",
              boxShadow: "0 0 20px rgba(0,212,255,0.4), 0 0 40px rgba(0,212,255,0.15)",
            }}
          >
            <span className="relative z-10 flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Join Game
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </Link>

          <Link
            href="/dashboard"
            className="group relative px-10 py-5 font-[family-name:var(--font-rajdhani)] font-bold text-xl uppercase tracking-widest rounded transition-all duration-300 overflow-hidden text-[#9B5DE5]"
            style={{
              border: "1px solid rgba(155,93,229,0.5)",
              background: "rgba(155,93,229,0.08)",
              boxShadow: "0 0 20px rgba(155,93,229,0.15)",
            }}
          >
            <span className="relative z-10 flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Create Quiz
            </span>
            <div className="absolute inset-0 bg-[#9B5DE5]/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </Link>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-3 justify-center mt-6 opacity-60">
          {["AI Question Generation", "Live Leaderboard", "QR Code Join", "Real-time Scoring", "Host Controls"].map(f => (
            <span key={f} className="px-3 py-1 rounded-full text-xs font-[family-name:var(--font-space-mono)] text-[#6B7280] border border-[#6B7280]/20">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00D4FF]/30 to-transparent" />
    </main>
  );
}