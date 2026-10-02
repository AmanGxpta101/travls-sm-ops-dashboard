import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Challenge images go through a server action; X caps a still at 5 MB,
      // plus room for the multipart overhead.
      bodySizeLimit: "6mb",
    },
  },
  images: {
    // Challenge images live in the service's public Supabase Storage bucket.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
};

export default nextConfig;
