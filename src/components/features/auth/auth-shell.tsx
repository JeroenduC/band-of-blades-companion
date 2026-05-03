export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="min-h-screen bg-parchment-noise flex flex-col items-center justify-center py-12 px-6"
      style={{ colorScheme: 'light' }}
    >
      {/* Compact brand header */}
      <div className="w-full max-w-[480px] text-center mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-auth-ink-faint mb-2.5">
          338th Legion · Campaign Phase
        </p>
        <h1 className="font-fell text-[56px] font-bold leading-[0.95] tracking-[0.01em] text-auth-ink">
          Band of Blades
        </h1>
        <div className="w-12 h-[3px] bg-auth-amber mx-auto mt-4 mb-3" />
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-auth-ink-soft">
          Legion Phase Companion
        </p>
      </div>

      {/* Form card */}
      <div className="w-full max-w-[480px] border-[3px] border-double border-auth-ink bg-auth-paper-light px-10 py-10">
        {children}
      </div>

      {/* Flavour quote */}
      <blockquote
        aria-hidden="true"
        className="w-full max-w-[480px] border-l-2 border-auth-amber pl-3.5 mt-7"
      >
        <p className="font-crimson italic text-sm text-auth-ink-faint leading-relaxed">
          &ldquo;Every choice is a debt. Every debt comes due.&rdquo;
        </p>
      </blockquote>
    </main>
  );
}
