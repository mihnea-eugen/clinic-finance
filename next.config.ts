import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
