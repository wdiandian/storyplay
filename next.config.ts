import type { NextConfig } from "next";

const config: NextConfig = {
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  reactStrictMode: true,
  typedRoutes: false,
  turbopack: {
    root: __dirname,
  },
  // Covers are content-managed assets and may be regenerated in place.
  // Keep first-loads fresh; callers can still add query versions for cache busting.
  async headers() {
    return [
      {
        source: "/home/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default config;
