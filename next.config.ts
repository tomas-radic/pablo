import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev server only: let phones on the home network (http://192.168.x.x:3000) load the
  // dev scripts. Without this Next.js blocks them and the pages never become interactive.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  experimental: {
    agentFeedback: true,
    // Offline detection, the useOffline() hook, and retrying navigations once back online.
    useOffline: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // The service worker must never be served from a cache, so updates reach phones.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
