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
  // Mark Tauri plugins and Node.js-only packages as external for server
  serverExternalPackages: [
    '@tauri-apps/plugin-fs',
    '@tauri-apps/plugin-dialog', 
    '@tauri-apps/plugin-shell',
    '@tauri-apps/api',
    '@zilliz/milvus2-sdk-node',
    '@pinecone-database/pinecone',
    'monaco-editor',
    'playwright',
    'playwright-core',
    '@tavily/core',
  ],
  // Turbopack config - alias Tauri plugins and Node.js-only packages to stubs for browser/SSR builds
  turbopack: {
    resolveAlias: {
      '@tauri-apps/plugin-fs': './lib/stubs/tauri-stubs.ts',
      '@tauri-apps/plugin-dialog': './lib/stubs/tauri-stubs.ts',
      '@tauri-apps/plugin-shell': './lib/stubs/tauri-stubs.ts',
      '@tauri-apps/api/event': './lib/stubs/tauri-stubs.ts',
      '@zilliz/milvus2-sdk-node': './lib/stubs/milvus-stub.ts',
      '@pinecone-database/pinecone': './lib/stubs/pinecone-stub.ts',
      'monaco-editor': './lib/stubs/monaco-stub.ts',
      'playwright': './lib/stubs/playwright-stub.ts',
      'playwright-core': './lib/stubs/playwright-stub.ts',
      '@tavily/core': './lib/stubs/tavily-stub.ts',
    },
  },
  // Webpack config for production builds (non-Turbopack)
  webpack: (config, { isServer }) => {
    // Handle Node.js-only packages for client-side builds
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@zilliz/milvus2-sdk-node': require.resolve('./lib/stubs/milvus-stub.ts'),
        '@pinecone-database/pinecone': require.resolve('./lib/stubs/pinecone-stub.ts'),
        'monaco-editor': require.resolve('./lib/stubs/monaco-stub.ts'),
        'playwright': require.resolve('./lib/stubs/playwright-stub.ts'),
        'playwright-core': require.resolve('./lib/stubs/playwright-stub.ts'),
        '@tavily/core': require.resolve('./lib/stubs/tavily-stub.ts'),
      };
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        child_process: false,
        dns: false,
        async_hooks: false,
      };
    }
    return config;
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
