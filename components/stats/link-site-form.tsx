"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { linkSiteAction } from "@/app/actions/stats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LinkSiteForm() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await linkSiteAction({ domain });
          if (result.ok) {
            toast.success(result.message);
            router.refresh();
          } else toast.error(result.message);
        });
      }}
    >
      <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="np. brukcafe.pl" className="sm:max-w-xs" />
      <Button type="submit" disabled={pending || domain.trim().length < 3}>
        {pending ? "Podpinam…" : "Podepnij stronę"}
      </Button>
    </form>
  );
}
