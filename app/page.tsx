import { redirect } from "next/navigation";

import { ComingSoon } from "@/components/marketing/coming-soon";
import { getSession } from "@/lib/auth/session";
import { marketingMetadata } from "@/lib/marketing-meta";

export const dynamic = "force-dynamic";

export const metadata = marketingMetadata(
  "en",
  "",
  "toodip — launching Q4 2026",
  "toodip measures how often AI assistants recommend your venue, and shows what to fix. Launching Q4 2026 — join the waitlist.",
);

export default async function RootPage() {
  // Existing clients and the agency still land in the panel; the public sees
  // the pre-launch page. The real landing is kept in the repo for launch.
  const session = await getSession();
  if (session) redirect("/dashboard");
  return <ComingSoon locale="en" />;
}
