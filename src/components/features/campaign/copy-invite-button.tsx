'use client';

import { useState } from 'react';

export function CopyInviteButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs font-mono uppercase tracking-widest text-legion-text-muted underline underline-offset-4 hover:text-legion-text-primary transition-colors min-h-[44px] px-2"
      aria-label={`Copy invite code ${code} to clipboard`}
      aria-live="polite"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
