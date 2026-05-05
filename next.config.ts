import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist uses canvas optionally on server; mark as external to avoid bundling issues
  serverExternalPackages: ['canvas'],
};

export default nextConfig;
