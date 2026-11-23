import type { NextConfig } from "next";

// Set by guide-capture/run.mjs, which builds a throwaway copy of the app
// against a mock backend to screenshot it. That build goes in its own folder,
// and skips the type check: it runs before figures.ts is regenerated, so a
// tour step for a brand-new screenshot would otherwise fail it. The real
// build still type-checks everything.
const guideCapture = process.env.CB_GUIDE_CAPTURE === "1";

/** Where Circuit Book lives, and the address it used to have. */
const HOME = "https://circuitbook.mkcworkspace.com";
const OLD_HOST = "mkp-tools-circuit-book.vercel.app";

const nextConfig: NextConfig = {
  ...(guideCapture && { distDir: ".next-guide", typescript: { ignoreBuildErrors: true } }),
  // Old links and Home Screen icons land on the new address. Only the old
  // production host matches, so preview and deployment URLs keep working.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: OLD_HOST }],
        destination: `${HOME}/:path*`,
        permanent: true,
      },
    ];
  },
  // The service worker must never be served from a stale cache, or a deploy
  // can leave an old worker in charge of the shell indefinitely.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
