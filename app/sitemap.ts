import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/stripe";

/** Public pages only. The panel is behind auth and has no business in an index. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  return ["/", "/pricing", "/sign-up", "/sign-in"].map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
