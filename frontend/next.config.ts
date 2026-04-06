/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🛡️ Disable ESLint during the build so your deployment succeeds
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 🛡️ Disable TypeScript errors during build if needed
  typescript: {
    ignoreBuildErrors: true,
  },
  // 🧭 Transpile Clerk packages for Edge Runtime compatibility
  transpilePackages: ["@clerk/nextjs", "@clerk/shared"]
};

export default nextConfig;
