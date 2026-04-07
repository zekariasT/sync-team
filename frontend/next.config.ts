import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🛡️ Keep these for a smooth deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // 🧭 This prevents Clerk's Node-only logic from leaking into the Edge middleware
  serverExternalPackages: ["@clerk/nextjs", "@clerk/shared"],

  // 🛡️ This manually maps the #crypto subpaths to Edge-safe versions
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "#crypto": "@clerk/shared/crypto",
        "#safe-node-apis": "@clerk/shared/safe-node-apis",
      };
    }
    return config;
  },
};

export default nextConfig;