import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Vercel sets this automatically at build time on every deploy — no
    // manual version bumping required. Empty locally (not built on Vercel).
    NEXT_PUBLIC_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "",
  },
};

export default nextConfig;
