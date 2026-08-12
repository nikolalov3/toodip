import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PricingPage } from "@/components/marketing/pricing-page";
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
}: PageProps<"/[lang]/pricing">): Promise<Metadata> {
  const { lang } = await params;
  if (!isMarketingLocale(lang) || lang === "en") return {};
  const dict = MARKETING_DICTS[lang];
  return marketingMetadata(
    lang,
    "/pricing",
    dict.pricing.title,
    dict.pricing.intro.slice(0, 155),
  );
}

export default async function LocalizedPricing({
  params,
}: PageProps<"/[lang]/pricing">) {
  const { lang } = await params;
  if (!isMarketingLocale(lang) || lang === "en") notFound();
  return <PricingPage dict={MARKETING_DICTS[lang]} locale={lang} />;
}
