import Link from "next/link";

import {
  LOCALE_LABELS,
  MARKETING_LOCALES,
  localePrefix,
  type MarketingLocale,
} from "@/lib/marketing-i18n";
import { cn } from "@/lib/utils";

/** Plain links between language versions. Crawlable on purpose. */
export function LocaleSwitch({
  current,
  path,
}: {
  current: MarketingLocale;
  /** Page path without the locale prefix: "" for landing, "/pricing". */
  path: string;
}) {
  return (
    <span className="flex items-center gap-2">
      {MARKETING_LOCALES.map((locale) => (
        <Link
          key={locale}
          href={`${localePrefix(locale)}${path}` || "/"}
          hrefLang={locale}
          className={cn(
            "uppercase hover:text-foreground",
            locale === current && "font-semibold text-foreground",
          )}
        >
          {locale}
        </Link>
      ))}
      <span className="sr-only">
        {MARKETING_LOCALES.map((locale) => LOCALE_LABELS[locale]).join(", ")}
      </span>
    </span>
  );
}
