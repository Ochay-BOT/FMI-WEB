import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // INI KUNCINYA: Mengabaikan error TypeScript saat build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Mengabaikan error ESLint saat build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;