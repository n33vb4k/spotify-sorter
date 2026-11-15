import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Spotify rejects "localhost" redirect URIs, so local dev runs on 127.0.0.1; let the dev server serve it.
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
};

export default nextConfig;
