import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // 🛡️ DO NOT use serverExternalPackages here - it breaks Edge Middleware
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 🗺️ Manually drawing the road map that Clerk is missing
      config.resolve.alias = {
        ...config.resolve.alias,
        "#crypto": path.resolve(__dirname, "node_modules/@clerk/shared/dist/crypto/index.mjs"),
        "#safe-node-apis": path.resolve(__dirname, "node_modules/@clerk/shared/dist/safe-node-apis/index.mjs"),
      };
    }
    return config;
  },
};

export default nextConfig;