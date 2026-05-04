/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@anthropic-ai/sdk"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mfhuomzltxvktjkmrucn.supabase.co",
      },
    ],
  },
};

export default nextConfig;
