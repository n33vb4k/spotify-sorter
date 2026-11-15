import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const isDev = process.env.NODE_ENV === "development";

/** Origins the browser talks to directly. Previews come from Deezer's CDN; models from our own origin by default. */
const modelOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_MODEL_BASE ? new URL(process.env.NEXT_PUBLIC_MODEL_BASE).origin : "";
  } catch {
    return "";
  }
})();
const DEEZER_CDN = "https://*.dzcdn.net";

/**
 * Content-Security-Policy without nonces (pages stay static). Inline scripts are allowed because Next's static
 * pages need them; the app never renders user data as HTML. 'wasm-unsafe-eval' lets onnxruntime compile its
 * WebAssembly; 'unsafe-eval' and the websocket are only for the dev server.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' https://api.spotify.com https://accounts.spotify.com ${DEEZER_CDN} ${modelOrigin}${isDev ? " ws: wss:" : ""}`.trim(),
  `media-src 'self' ${DEEZER_CDN}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Spotify rejects "localhost" redirect URIs, so local dev runs on 127.0.0.1; let the dev server serve it.
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The OAuth callback URL carries a one-time code; never leak it in a Referer.
      { source: "/callback", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
};

export default nextConfig;
