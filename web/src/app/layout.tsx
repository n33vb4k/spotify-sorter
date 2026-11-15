import type { Metadata, Viewport } from "next";
import { Big_Shoulders_Stencil, Figtree } from "next/font/google";
import "./globals.css";

const body = Figtree({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const stencil = Big_Shoulders_Stencil({ subsets: ["latin"], variable: "--font-stencil", display: "swap", axes: ["opsz"] });

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
