import { redirect } from "next/navigation";

import { LandingPage } from "@/components/marketing/landing-page";
import { getSession } from "@/lib/auth/session";
import { MARKETING_DICTS } from "@/lib/marketing-i18n";
import { marketingMetadata } from "@/lib/marketing-meta";

export const dynamic = "force-dynamic";

export const metadata = marketingMetadata(
  "en",
  "",
  "toodip",
  "Measure whether ChatGPT, Google AI Overviews and Perplexity recommend your venue, see the sources they cite, and fix what is missing.",
);

export default async function RootPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return <LandingPage dict={MARKETING_DICTS.en} locale="en" />;
}
