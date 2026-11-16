"use client";

import { useState, useTransition } from "react";

import { connectSearchConsoleAction } from "@/app/actions/visibility";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Connects Google Search Console in two steps the owner can do in five
 * minutes: add toodip's service account as a user of the property, then
 * paste the property's name. No OAuth, nothing stored but the property name.
 */
export function GscConnect({ serviceEmail, currentSiteUrl }: { serviceEmail: string | null; currentSiteUrl: string | null }) {
  const [siteUrl, setSiteUrl] = useState(currentSiteUrl ?? "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-2 text-[13px] leading-relaxed">
        <li className="flex gap-2.5">
          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">1</span>
          <span>
            In Google Search Console open the property, then <span className="font-medium">Settings → Users and permissions → Add user</span> and add{" "}
            {serviceEmail ? (
              <code className="rounded-md bg-muted px-1.5 py-0.5 text-[12.5px]">{serviceEmail}</code>
            ) : (
              <span className="text-caution">the toodip service account (not configured on this server yet)</span>
            )}{" "}
            with <span className="font-medium">Restricted</span> permission. It can read reports and change nothing.
          </span>
        </li>
        <li className="flex gap-2.5">
          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">2</span>
          <span>
            Paste the property exactly as Search Console names it: <code className="rounded-md bg-muted px-1.5 py-0.5 text-[12.5px]">sc-domain:example.com</code> for a
            domain property, or <code className="rounded-md bg-muted px-1.5 py-0.5 text-[12.5px]">https://example.com/</code> for a URL prefix.
          </span>
        </li>
      </ol>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await connectSearchConsoleAction({ siteUrl });
            setMessage({ ok: result.ok, text: result.message });
          });
        }}
      >
        <Input
          value={siteUrl}
          onChange={(event) => setSiteUrl(event.target.value)}
          placeholder="sc-domain:example.com"
          className="h-8 max-w-[320px] text-[13px]"
          aria-label="Search Console property"
        />
        <Button type="submit" size="sm" disabled={pending || siteUrl.trim().length < 6}>
          {pending ? "Connecting…" : currentSiteUrl ? "Update" : "Connect"}
        </Button>
        {message && (
          <p className={cn("text-[12.5px]", message.ok ? "text-positive" : "text-critical")} role="status">
            {message.text}
          </p>
        )}
      </form>
    </div>
  );
}
