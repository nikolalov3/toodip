import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/stripe";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/sign-up", "/sign-in"],
        disallow: ["/api/", "/dashboard", "/reviews", "/visibility", "/billing"],
      },
    ],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
