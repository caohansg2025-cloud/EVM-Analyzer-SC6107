/**
 * Next.js configuration.
 *
 * Design reference: docs/frontend-design.md §4.4
 * Next.js docs:     node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/transpilePackages.md
 *
 * Why `transpilePackages` is needed:
 *   - Recharts (used in Commit 10 for the gas breakdown chart) ships ESM
 *     code that depends on `window` at import time. Without transpilation
 *     Next.js's server-side bundler chokes during build.
 *   - react-syntax-highlighter (used in Commit 13 for Solidity code
 *     highlighting) ships uncompiled JSX that needs the project's TS/babel
 *     pipeline.
 *   Listing them here forces Next.js's compiler to process them rather
 *   than treating them as opaque `node_modules`.
 *
 * Added pre-emptively in Phase 1 so Phase 3 commits don't break the build.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["recharts", "react-syntax-highlighter"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
