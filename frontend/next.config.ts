import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // @ts-expect-error - nodeMiddleware is available in Next.js 15.2+ but not yet typed
    nodeMiddleware: true,
  },
};

export default nextConfig;