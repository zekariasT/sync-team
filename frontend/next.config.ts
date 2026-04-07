import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  serverExternalPackages: ["@clerk/nextjs", "@clerk/shared", "@clerk/backend"],
};

export default nextConfig;