import type { MetadataRoute } from "next";

import { MARKETING_LOCALES, localePrefix } from "@/lib/marketing-i18n";
import { appUrl } from "@/lib/stripe";

/** Public pages only. The panel is behind auth and has no business in an index. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of MARKETING_LOCALES) {
    for (const path of ["", "/pricing"]) {
      entries.push({
        url: `${base}${localePrefix(locale)}${path}` || base,
        changeFrequency: "weekly",
        priority: path === "" ? (locale === "en" ? 1 : 0.8) : 0.7,
      });
    }
  }
  entries.push(
    { url: `${base}/sign-up`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/sign-in`, changeFrequency: "weekly", priority: 0.4 },
  );
  return entries;
}
