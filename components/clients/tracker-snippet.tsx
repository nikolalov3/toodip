"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** The one line a client pastes before </head>; copies on click. */
export function TrackerSnippet({ siteId, domain }: { siteId: string; domain: string | null }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<script defer src="https://stats.toodip.com/s.js" data-id="${siteId}"></script>`;
  return (
    <button
      type="button"
      title={snippet}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(snippet);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked: the title still shows the line */
        }
      }}
      className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="size-3 text-positive" /> : <Copy className="size-3" />}
      {domain ?? "traffic site"} · copy tracker
    </button>
  );
}
