import { SignIn, SignUp } from '@clerk/nextjs';
import { Activity, Boxes, Database, Radio } from 'lucide-react';

const clerkAppearance = {
  variables: {
    colorPrimary: '#38bdf8',
    colorBackground: 'transparent',
    colorText: '#e2e8f0',
    colorTextSecondary: '#7c8aa0',
    colorInputBackground: 'rgba(148,163,184,0.06)',
    colorInputText: '#e2e8f0',
    colorNeutral: '#e2e8f0',
    borderRadius: '0.85rem',
    fontFamily: 'var(--font-hanken), system-ui, sans-serif',
    fontSize: '0.95rem',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full shadow-none',
    card: 'bg-transparent shadow-none border-0 p-0',
    headerTitle: 'font-display tracking-tight text-slate-50',
    headerSubtitle: 'text-slate-400',
    socialButtonsBlockButton:
      'border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-slate-200 transition-colors',
    dividerLine: 'bg-white/10',
    dividerText: 'text-slate-500 uppercase tracking-[0.2em] text-[10px]',
    formFieldLabel: 'text-slate-400 uppercase tracking-[0.15em] text-[10px] font-semibold',
    formFieldInput:
      'bg-white/[0.04] border border-white/10 text-slate-100 focus:border-sky-400/60',
    formButtonPrimary:
      'bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold tracking-wide normal-case shadow-[0_8px_30px_-8px_rgba(56,189,248,0.6)] transition-all',
    footer: 'bg-transparent',
    footerActionText: 'text-slate-500',
    footerActionLink: 'text-sky-400 hover:text-sky-300 font-semibold',
    formFieldInputShowPasswordButton: 'text-slate-400',
    identityPreviewEditButton: 'text-sky-400',
  },
};

const signals = [
  { icon: Activity, label: 'REAL-TIME PULSE', sub: 'Live presence over WebSockets' },
  { icon: Database, label: 'EVENT-DRIVEN RAG', sub: 'Gemini + Pinecone retrieval' },
  { icon: Boxes, label: 'MICROSERVICE CORE', sub: 'NestJS · RabbitMQ · workers' },
];

export default function AuthScene({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#020617] text-slate-100">
      {/* Atmosphere: signal glows + technical grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(50rem 50rem at 8% -10%, rgba(56,189,248,0.18), transparent 60%),' +
            'radial-gradient(40rem 40rem at 95% 110%, rgba(251,113,133,0.12), transparent 55%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(120% 90% at 30% 20%, #000 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(120% 90% at 30% 20%, #000 30%, transparent 80%)',
        }}
      />

      <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* ---------- Left: brand / mission panel ---------- */}
        <section className="relative hidden flex-col justify-between border-r border-white/10 p-10 lg:flex xl:p-14">
          {/* Top status bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              System Online
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-slate-600">
              v1.0 · SECURE
            </span>
          </div>

          {/* Center: wordmark + tagline */}
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-sky-300/80">
              <Radio size={12} /> Team Operating System
            </div>
            <h1 className="font-display text-6xl font-extrabold leading-[0.95] tracking-tight text-slate-50 xl:text-7xl">
              SYNCPOINT
              <span className="text-sky-400">_OS</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-400">
              Mission control for remote-first teams — live presence, AI-grounded
              knowledge, and an event-driven core that scales.
            </p>

            {/* Signal list */}
            <div className="mt-10 space-y-3">
              {signals.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="group flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-sky-400 transition-colors group-hover:border-sky-400/40">
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                      {label}
                    </div>
                    <div className="text-sm text-slate-500">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom techline */}
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600">
            NestJS · Next.js · Pinecone · RabbitMQ · Redis · MariaDB
          </div>
        </section>

        {/* ---------- Right: access terminal ---------- */}
        <section className="relative flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            {/* Mobile mini-wordmark */}
            <div className="mb-8 lg:hidden">
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-50">
                SYNCPOINT<span className="text-sky-400">_OS</span>
              </h1>
            </div>

            <div className="mb-6">
              <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-sky-400/80">
                {mode === 'sign-in' ? 'Access Terminal' : 'Provision Access'}
              </div>
              <h2 className="font-display mt-1 text-2xl font-bold tracking-tight text-slate-100">
                {mode === 'sign-in' ? 'Authenticate to continue' : 'Create your operator account'}
              </h2>
            </div>

            {/* Themed Clerk widget on a glass panel */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 shadow-[0_30px_80px_-30px_rgba(2,6,23,0.9)] backdrop-blur-sm">
              {mode === 'sign-in' ? (
                <SignIn appearance={clerkAppearance} />
              ) : (
                <SignUp appearance={clerkAppearance} />
              )}
            </div>

            <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-slate-600">
              Encrypted session · Clerk-secured
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
