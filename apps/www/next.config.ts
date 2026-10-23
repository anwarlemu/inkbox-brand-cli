import path from "node:path";
import type { NextConfig } from "next";

// The library lives in ../../registry; the docs render it straight from source.
const root = path.join(import.meta.dirname, "../..");

const config: NextConfig = {
  turbopack: { root },
  outputFileTracingRoot: root,
  // Opaque-origin preview frames can load the same public, fingerprinted font files as the docs.
  async headers() {
    return [{ source: "/_next/static/media/:path*", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }] }];
  },
  // The repo has its own agent instructions; dev must not write AGENTS.md and CLAUDE.md here.
  agentRules: false,
};

export default config;
