import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone rompe el empaquetado de Vercel en Next 16.3 (ENOENT next-server.js.nft.json).
  // Se mantiene para builds self-hosted (cPanel/Docker) donde VERCEL no está definido.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
};

export default nextConfig;
