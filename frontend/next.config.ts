import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // This is the key fix for the "pathname" error with Clerk on Canary
    nodeMiddleware: true, 
  },
};

export default nextConfig;