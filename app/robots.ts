import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/stripe";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/sign-in"],
        disallow: ["/api/", "/overview", "/visibility", "/traffic", "/conversions", "/bots", "/install", "/billing"],
      },
    ],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
