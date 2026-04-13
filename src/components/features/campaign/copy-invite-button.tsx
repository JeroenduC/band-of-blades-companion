'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

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
      className="inline-flex items-center justify-center text-legion-text-muted hover:text-legion-amber transition-colors min-h-[44px] min-w-[44px]"
      aria-label="Copy invite code to clipboard"
    >
      {copied
        ? <Check size={16} aria-hidden="true" />
        : <Copy size={16} aria-hidden="true" />
      }
    </button>
  );
}
