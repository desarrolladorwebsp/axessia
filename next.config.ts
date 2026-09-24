import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
    workerThreads: false,
    webpackBuildWorker: false,
  },
  // cPanel's process limit prevents Next from starting its duplicate type-check worker.
  // TypeScript remains checked strictly in local/CI validation before deployment.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
