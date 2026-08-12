import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { LandingPage } from "@/components/marketing/landing-page";
import { getSession } from "@/lib/auth/session";
import {
  MARKETING_DICTS,
  MARKETING_LOCALES,
  isMarketingLocale,
} from "@/lib/marketing-i18n";
import { marketingMetadata } from "@/lib/marketing-meta";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return MARKETING_LOCALES.filter((locale) => locale !== "en").map((lang) => ({
    lang,
  }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isMarketingLocale(lang) || lang === "en") return {};
  return marketingMetadata(
    lang,
    "",
    "toodip",
    MARKETING_DICTS[lang].hero.body.slice(0, 155),
  );
}

export default async function LocalizedLanding({
  params,
}: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isMarketingLocale(lang) || lang === "en") notFound();
  const session = await getSession();
  if (session) redirect("/dashboard");
  return <LandingPage dict={MARKETING_DICTS[lang]} locale={lang} />;
}
