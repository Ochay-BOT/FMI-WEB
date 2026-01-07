import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, // Matikan cek error TS
  },
  eslint: {
    ignoreDuringBuilds: true, // Matikan cek error ESLint
  },
};

export default nextConfig;