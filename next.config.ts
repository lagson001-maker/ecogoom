import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    // Supabase Storage (public + signed URLs). Custom domains come from the env var.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/**" },
      ...(supabaseHost && !supabaseHost.endsWith(".supabase.co")
        ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/**" }]
        : []),
      { protocol: "http", hostname: "127.0.0.1", port: "54321", pathname: "/storage/v1/object/**" },
    ],
  },
  experimental: {
    serverActions: {
      // Reference images are uploaded straight to Storage, so actions stay small.
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
