import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint config needs updating for Next.js 15's export format — fix in Epic 2.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
