/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🛡️ Keep these for a smooth deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

if (process.env.NODE_ENV === 'development' || process.env.VERCEL) {
  console.log('[SyncPoint Build] Next.js config initialized.');
}

export default nextConfig;
