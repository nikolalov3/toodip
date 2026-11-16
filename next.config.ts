import type { NextConfig } from "next";

/**
 * Screens of the retired review-reply module. Old bookmarks and links land on
 * the overview instead of a 404.
 */
const RETIRED_PATHS = [
  "/reply",
  "/reviews",
  "/reviews/:id",
  "/queue",
  "/prompt-studio",
  "/brand",
  "/social",
  "/competitors",
  "/dashboard",
  "/activity",
];

const nextConfig: NextConfig = {
  async redirects() {
    return RETIRED_PATHS.map((source) => ({
      source,
      destination: "/overview",
      permanent: false,
    }));
  },
};

export default nextConfig;
