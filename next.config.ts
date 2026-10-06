import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";
import { spawnSync } from "node:child_process";

// Short commit of this build, shown in Settings so a phone's installed app can be checked against the latest deploy.
const BUILD_ID = (
  process.env.VERCEL_GIT_COMMIT_SHA ||
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  "dev"
).slice(0, 7);

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  // pdfjs-dist uses canvas optionally on server; mark as external to avoid bundling issues
  serverExternalPackages: ['canvas'],
  // Supabase's local site_url (and so the link in the confirmation mail) is
  // http://127.0.0.1:3000; without this the dev server refuses its dev assets
  // for that host and the page never becomes interactive.
  allowedDevOrigins: ['127.0.0.1'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // Receipt scanning uses the camera; nothing else needs device access.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
      {
        // The worker must always be revalidated, or users stay on an old version.
        source: '/serwist/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          // Scripts only from this origin; fetches may go to any https host (images, fonts).
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; connect-src 'self' https:" },
        ],
      },
    ];
  },
};

// Keeps esbuild (used to bundle the service worker) out of the server bundle.
export default withSerwist(nextConfig);
