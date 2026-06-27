import { SignIn, SignUp } from '@clerk/nextjs';
import { Activity, Boxes, Database, Radio } from 'lucide-react';

// Clerk widget themed onto the Team Pulse light tokens (auth renders on the
// default light theme). Element classNames use our Tailwind token utilities.
const clerkAppearance = {
  variables: {
    colorPrimary: '#4C6F60',
    colorBackground: '#FCFAF6',
    colorText: '#2B2722',
    colorTextSecondary: '#5F5950',
    colorInputBackground: 'rgba(92,131,116,0.06)',
    colorInputText: '#2B2722',
    colorNeutral: '#2B2722',
    borderRadius: '0.7rem',
    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
    fontSize: '0.95rem',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full shadow-none',
    card: 'bg-transparent shadow-none border-0 p-0',
    headerTitle: 'font-display tracking-tight text-foreground',
    headerSubtitle: 'text-muted-foreground',
    socialButtonsBlockButton:
      'border border-border bg-muted hover:bg-surface-3 text-foreground transition-colors',
    dividerLine: 'bg-border',
    dividerText: 'text-text-faint uppercase tracking-[0.2em] text-[10px]',
    formFieldLabel: 'text-muted-foreground uppercase tracking-[0.15em] text-[10px] font-semibold',
    formFieldInput:
      'bg-surface-2 border border-border text-foreground focus:border-brand',
    formButtonPrimary:
      'bg-primary hover:bg-[var(--primary-hover)] text-primary-foreground font-bold tracking-wide normal-case transition-all',
    footer: 'bg-transparent',
    footerActionText: 'text-muted-foreground',
    footerActionLink: 'text-brand-text hover:text-brand font-semibold',
    formFieldInputShowPasswordButton: 'text-muted-foreground',
    identityPreviewEditButton: 'text-brand-text',
  },
};

const signals = [
  { icon: Activity, label: 'REAL-TIME PULSE', sub: 'Live presence over WebSockets' },
  { icon: Database, label: 'EVENT-DRIVEN RAG', sub: 'Gemini + Pinecone retrieval' },
  { icon: Boxes, label: 'MICROSERVICE CORE', sub: 'NestJS · RabbitMQ · workers' },
];

export default function AuthScene({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Atmosphere: soft sage/primary glows + faint technical grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(50rem 50rem at 8% -10%, color-mix(in oklch, var(--brand) 18%, transparent), transparent 60%),' +
            'radial-gradient(40rem 40rem at 95% 110%, color-mix(in oklch, var(--primary-c) 14%, transparent), transparent 55%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'linear-gradient(color-mix(in oklch, var(--border-strong) 80%, transparent) 1px, transparent 1px),' +
            'linear-gradient(90deg, color-mix(in oklch, var(--border-strong) 80%, transparent) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(120% 90% at 30% 20%, #000 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(120% 90% at 30% 20%, #000 30%, transparent 80%)',
        }}
      />

      <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* ---------- Left: brand / mission panel ---------- */}
        <section className="relative hidden flex-col justify-between border-r border-border p-10 lg:flex xl:p-14">
          {/* Top status bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-presence opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-presence" />
              </span>
              System Online
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-text-faint">
              v1.0 · SECURE
            </span>
          </div>

          {/* Center: wordmark + tagline */}
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--brand-soft-border)] bg-[var(--brand-soft)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-brand-text">
              <Radio size={12} /> Team Operating System
            </div>
            <h1 className="font-display text-6xl font-extrabold leading-[0.95] tracking-tight text-foreground xl:text-7xl">
              SYNCPOINT
              <span className="text-brand">_OS</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
              Mission control for remote-first teams — live presence, AI-grounded
              knowledge, and an event-driven core that scales.
            </p>

            {/* Signal list */}
            <div className="mt-10 space-y-3">
              {signals.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="group flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-brand transition-colors group-hover:border-brand/40">
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
                      {label}
                    </div>
                    <div className="text-sm text-text-faint">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom techline */}
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-faint">
            NestJS · Next.js · Pinecone · RabbitMQ · Redis · MariaDB
          </div>
        </section>

        {/* ---------- Right: access terminal ---------- */}
        <section className="relative flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            {/* Mobile mini-wordmark */}
            <div className="mb-8 lg:hidden">
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">
                SYNCPOINT<span className="text-brand">_OS</span>
              </h1>
            </div>

            <div className="mb-6">
              <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-brand-text">
                {mode === 'sign-in' ? 'Access Terminal' : 'Provision Access'}
              </div>
              <h2 className="font-display mt-1 text-2xl font-bold tracking-tight text-foreground">
                {mode === 'sign-in' ? 'Authenticate to continue' : 'Create your operator account'}
              </h2>
            </div>

            {/* Themed Clerk widget on a surface panel */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card backdrop-blur-sm">
              {mode === 'sign-in' ? (
                <SignIn appearance={clerkAppearance} />
              ) : (
                <SignUp appearance={clerkAppearance} />
              )}
            </div>

            <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-text-faint">
              Encrypted session · Clerk-secured
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
