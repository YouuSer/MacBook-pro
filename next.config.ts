import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_DEPLOYED_AT:
      process.env.NEXT_PUBLIC_DEPLOYED_AT ?? new Date().toISOString(),
  },
};

export default nextConfig;
