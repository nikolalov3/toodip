import { PricingPage } from "@/components/marketing/pricing-page";
import { MARKETING_DICTS } from "@/lib/marketing-i18n";
import { marketingMetadata } from "@/lib/marketing-meta";

export const dynamic = "force-dynamic";

export const metadata = marketingMetadata(
  "en",
  "/pricing",
  "Pricing",
  "Plans for the review reply desk and AI visibility measurement. Monthly subscriptions in EUR, 7-day trials, cancel any time.",
);

export default function Page() {
  return <PricingPage dict={MARKETING_DICTS.en} locale="en" />;
}
