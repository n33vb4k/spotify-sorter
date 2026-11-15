import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const body = Figtree({ subsets: ["latin"], variable: "--font-body", display: "swap" });
// Self-hosted (SIL OFL): next/font/google has no fallback metrics for this face and warns on every compile.
const stencil = localFont({
  src: "./fonts/BigShouldersStencil-latin.woff2",
  weight: "100 900",
  variable: "--font-stencil",
  display: "swap",
});

export const metadata: Metadata = {
  title: "spotify-sorter: sort your liked songs by how they sound",
  description:
    "Listens to every song in your Spotify Liked Songs, works out its style and mood in your browser, and builds new private playlists you review first.",
};

export const viewport: Viewport = { themeColor: "#1b1814", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${body.variable} ${stencil.variable}`}>
      <body>{children}</body>
    </html>
  );
}
