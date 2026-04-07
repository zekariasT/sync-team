import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // 🛡️ CRITICAL: Do NOT use serverExternalPackages. 
  // We need Webpack to "see" and "alias" these files.

  webpack: (config) => {
    // 🗺️ Manually mapping the broken hashtags to real files
    config.resolve.alias = {
      ...config.resolve.alias,
      "#crypto": "@clerk/shared/crypto",
      "#safe-node-apis": "@clerk/shared/safe-node-apis",
    };
    return config;
  },
};

export default nextConfig;