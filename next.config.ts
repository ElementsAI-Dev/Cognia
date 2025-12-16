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
