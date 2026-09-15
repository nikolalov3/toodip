import { redirect } from "next/navigation";

import { ComingSoon } from "@/components/marketing/coming-soon";
import { getSession } from "@/lib/auth/session";
import { marketingMetadata } from "@/lib/marketing-meta";

export const dynamic = "force-dynamic";

export const metadata = marketingMetadata(
  "en",
  "",
  "toodip — Waitlist",
  "toodip tracks how often ChatGPT, Google AI Overviews and Perplexity recommend your venue, and turns every gap into a clear next move. Access opens in waves — join the list.",
);

export default async function RootPage() {
  // Existing clients and the agency still land in the panel; the public sees
  // the pre-launch page. The real landing is kept in the repo for launch.
  const session = await getSession();
  if (session) redirect("/dashboard");
  return <ComingSoon locale="en" />;
}
