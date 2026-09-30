import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist uses canvas optionally on server; mark as external to avoid bundling issues
  serverExternalPackages: ['canvas'],
  // Supabase's local site_url (and so the link in the confirmation mail) is
  // http://127.0.0.1:3000; without this the dev server refuses its dev assets
  // for that host and the page never becomes interactive.
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
