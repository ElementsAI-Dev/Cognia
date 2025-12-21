import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Enable static export for Tauri production builds.
// This makes `pnpm build` generate the `out/` directory that Tauri loads from `src-tauri/tauri.conf.json` (frontendDist: "../out").
const nextConfig: NextConfig = {
  // Only use export mode for production builds, not development
  output: isProd ? "export" : undefined,
  // Note: This feature is required to use the Next.js Image component in SSG mode.
  // See https://nextjs.org/docs/messages/export-image-api for different workarounds.
  images: {
    unoptimized: true,
  },
  // Mark Tauri plugins as external for server - they only work in Tauri runtime
  serverExternalPackages: [
    '@tauri-apps/plugin-fs',
    '@tauri-apps/plugin-dialog', 
    '@tauri-apps/plugin-shell',
    '@tauri-apps/api',
  ],
  // Turbopack config - alias Tauri plugins to stubs for browser/SSR builds
  turbopack: {
    resolveAlias: {
      '@tauri-apps/plugin-fs': './lib/tauri-stubs.ts',
      '@tauri-apps/plugin-dialog': './lib/tauri-stubs.ts',
      '@tauri-apps/plugin-shell': './lib/tauri-stubs.ts',
    },
  },
  // Remove assetPrefix entirely - it's not needed for Tauri development
  // and causes CORS issues when ports don't match
  // Enable CORS for development (only works when not in export mode)
  ...(!isProd && {
    async headers() {
      return [
        {
          source: '/_next/static/(.*)',
          headers: [
            {
              key: 'Access-Control-Allow-Origin',
              value: '*',
            },
          ],
        },
      ];
    },
  }),
};

export default nextConfig;
