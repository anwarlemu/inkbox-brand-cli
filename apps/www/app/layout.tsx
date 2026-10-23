import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";

import { registryName, registryUrl } from "@www/lib/registry";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(registryUrl),
  title: { default: `${registryName} design system`, template: `%s | ${registryName} design system` },
  alternates: { types: { "text/markdown": "/agents.md", "text/plain": "/llms.txt" } },
  description: `Components, design tokens and CLI guidance for building ${registryName} interfaces.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
