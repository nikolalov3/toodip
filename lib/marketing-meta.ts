import type { Metadata } from "next";

import {
  MARKETING_LOCALES,
  localePrefix,
  type MarketingLocale,
} from "@/lib/marketing-i18n";
import { appUrl } from "@/lib/stripe";

/** hreflang alternates for one public page across every locale. */
export function marketingMetadata(
  locale: MarketingLocale,
  path: string,
  title: string,
  description: string,
): Metadata {
  const base = appUrl();
  const languages = Object.fromEntries(
    MARKETING_LOCALES.map((l) => [l, `${base}${localePrefix(l)}${path}` || base]),
  );
  return {
    // Landing pages carry the bare product name, not "toodip | toodip".
    title: path === "" ? { absolute: title } : title,
    description,
    alternates: {
      canonical: `${base}${localePrefix(locale)}${path}` || base,
      languages: { ...languages, "x-default": `${base}${path}` || base },
    },
  };
}
