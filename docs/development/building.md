# Building and Deployment Guide

This guide covers building the Cognia application for development, production, and desktop distribution.

## Table of Contents

- [Development Build](#development-build)
- [Production Build](#production-build)
- [Desktop Build](#desktop-build)
- [Build Configuration](#build-configuration)
- [Optimization Strategies](#optimization-strategies)
- [Deployment Options](#deployment-options)

## Development Build

### Starting Development Server

```bash
# Start Next.js dev server
pnpm dev

# Server details
# URL: http://localhost:3000
# Hot reload: Enabled
# TypeScript checking: Enabled
```

### Development Build Options

```bash
# Start on different port
pnpm dev -- -p 3001

# Start with Turbopack (faster refresh)
pnpm dev -- --turbo

# Start with experimental features
pnpm dev --experimental-app
```

### Development Build with Tauri

```bash
# Start desktop app in development mode
pnpm tauri dev

# This will:
# 1. Start Next.js on port 3001
# 2. Compile Rust backend in debug mode
# 3. Open desktop window
# 4. Enable hot reload for both frontend and backend
```

### Development Build Verification

```bash
# Type check without compilation
pnpm exec tsc --noEmit

# Check for ESLint errors
pnpm lint

# Run tests
pnpm test
```

## Production Build

### Web Application Build

```bash
# Build static export
pnpm build

# Output directory: out/
# Contains: HTML, CSS, JS, fonts, images
# Optimized for: Static hosting, CDN deployment
```

### Build Output

```
out/
├── index.html                    # Landing page
├── (chat)/
│   └── index.html               # Chat interface
├── settings/
│   └── index.html               # Settings page
├── projects/
│   └── index.html               # Projects page
├── _next/
│   ├── static/
│   │   ├── chunks/              # JavaScript chunks
│   │   ├── media/               # Images and fonts
│   │   └── ...                  # Other assets
│   └── ...                      # Next.js runtime
└── ...                          # Other static files
```

### Production Build Configuration

`next.config.ts`:

```typescript
const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Static export for production
  output: isProd ? 'export' : undefined,

  // Unoptimized images (required for static export)
  images: {
    unoptimized: true,
  },

  // Mark Tauri plugins as external
  serverExternalPackages: [
    '@tauri-apps/plugin-fs',
    '@tauri-apps/plugin-dialog',
    '@tauri-apps/plugin-shell',
  ],

  // Alias Tauri plugins to stubs for browser builds
  turbopack: {
    resolveAlias: {
      '@tauri-apps/plugin-fs': './lib/tauri-stubs.ts',
      '@tauri-apps/plugin-dialog': './lib/tauri-stubs.ts',
      '@tauri-apps/plugin-shell': './lib/tauri-stubs.ts',
    },
  },
};
```

### Preview Production Build

```bash
# Build production version
pnpm build

# Preview locally (requires simple HTTP server)
npx serve out

# Or using Python
python -m http.server 8000 --directory out

# Or using Node
npx http-server out -p 8000
```

### Production Build Analysis

```bash
# Build with bundle analyzer
pnpm build --analyze

# Check output size
du -sh out/

# List largest files
du -ah out/ | sort -rh | head -20
```

## Desktop Build

### Desktop Application Build

```bash
# Build desktop app for current platform
pnpm tauri build

# Build options
pnpm tauri build --target x86_64-pc-windows-msvc  # Windows
pnpm tauri build --target x86_64-apple-darwin     # macOS Intel
pnpm tauri build --target aarch64-apple-darwin    # macOS ARM
pnpm tauri build --target x86_64-unknown-linux-gnu # Linux
```

### Build Output Locations

**Windows**:

```
src-tauri/target/release/bundle/
├── msi/
│   └── Cognia_0.1.0_x64_en-US.msi
├── nsis/
│   └── Cognia_0.1.0_x64-setup.exe
└── ...
```

**macOS**:

```
src-tauri/target/release/bundle/
├── dmg/
│   └── Cognia_0.1.0_x64.dmg
├── macos/
│   └── Cognia.app
└── ...
```

**Linux**:

```
src-tauri/target/release/bundle/
├── appimage/
│   └── cognia_0.1.0_amd64.AppImage
├── deb/
│   └── cognia_0.1.0_amd64.deb
└── ...
```

### Desktop Build Configuration

`src-tauri/tauri.conf.json`:

```json
{
  "productName": "Cognia",
  "version": "0.1.0",
  "identifier": "com.elementsai.cognia",

  "build": {
    "frontendDist": "../out",
    "devUrl": "http://localhost:3001",
    "beforeDevCommand": "cross-env TAURI=true pnpm dev -p 3001",
    "beforeBuildCommand": "pnpm build"
  },

  "app": {
    "windows": [
      {
        "title": "Cognia",
        "width": 1280,
        "height": 800,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  },

  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

### Cross-Platform Desktop Builds

#### Build for All Platforms

GitHub Actions workflow builds for all platforms:

```yaml
# .github/workflows/ci.yml
build-tauri:
  strategy:
    matrix:
      include:
        - platform: ubuntu-latest
          target: x86_64-unknown-linux-gnu
        - platform: windows-latest
          target: x86_64-pc-windows-msvc
        - platform: macos-latest
          target: x86_64-apple-darwin
        - platform: macos-latest
          target: aarch64-apple-darwin

  runs-on: ${{ matrix.platform }}
  steps:
    - name: Build Tauri app
      run: pnpm tauri build --target ${{ matrix.target }}
```

#### Manual Cross-Platform Builds

**Building on Windows for Windows**:

```bash
pnpm tauri build --target x86_64-pc-windows-msvc
```

**Building on macOS for macOS**:

```bash
# Intel build
pnpm tauri build --target x86_64-apple-darwin

# ARM build (Apple Silicon)
pnpm tauri build --target aarch64-apple-darwin

# Universal binary (requires additional tooling)
# See: https://tauri.app/v1/guides/distribution/#universal-binaries
```

**Building on Linux for Linux**:

```bash
pnpm tauri build --target x86_64-unknown-linux-gnu
```

### Code Signing

#### Windows Code Signing

```bash
# Set environment variables
$env:WINDOWS_CERTIFICATE = "base64-encoded-certificate"
$env:WINDOWS_CERTIFICATE_PASSWORD = "certificate-password"

# Build with signing
pnpm tauri build --target x86_64-pc-windows-msvc
```

#### macOS Code Signing

```bash
# Set environment variables
export APPLE_CERTIFICATE="base64-encoded-certificate"
export APPLE_CERTIFICATE_PASSWORD="certificate-password"
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name"
export APPLE_ID="your-apple-id@example.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="your-team-id"

# Build with signing
pnpm tauri build --target x86_64-apple-darwin
```

### Debug vs Release Builds

```bash
# Debug build (faster compilation, larger size)
pnpm tauri build --debug

# Release build (optimized, smaller size)
pnpm tauri build

# Compare sizes
ls -lh src-tauri/target/debug/
ls -lh src-tauri/target/release/
```

## Build Configuration

### Next.js Configuration

`next.config.ts` options:

```typescript
const nextConfig: NextConfig = {
  // Static export (required for Tauri)
  output: isProd ? 'export' : undefined,

  // Image optimization (disabled for static export)
  images: {
    unoptimized: true,
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Custom webpack config
    return config;
  },

  // Headers for CORS (development only)
  ...(isProd
    ? {}
    : {
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
```

### TypeScript Configuration

`tsconfig.json` options:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": false,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Tailwind CSS Configuration

`tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... more colors
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

## Optimization Strategies

### Code Splitting

Next.js automatically splits code by routes. Additional strategies:

```typescript
// Dynamic imports for heavy components
const MonacoEditor = dynamic(() => import('./monaco-editor'), {
  loading: () => <Spinner />,
  ssr: false
});

// Dynamic imports for route groups
const HeavyPage = dynamic(() => import('./heavy-page'));
```

### Bundle Size Optimization

```bash
# Analyze bundle size
pnpm build --analyze

# Check for large dependencies
pnpm ls --depth=0 | grep -E '[0-9]+\.[0-9]+\sGB'

# Find unused exports
npx depcheck
```

### Tree Shaking

```typescript
// ✅ Good: Import specific functions
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ❌ Bad: Import entire library
import * as zustand from 'zustand';
```

### Image Optimization

Since static export disables Next.js Image optimization:

```typescript
// ✅ Good: Use appropriate image formats
<img src="/logo.png" alt="Logo" width="200" height="50" />

// ❌ Bad: Unoptimized large images
<img src="/huge-image.png" alt="Image" />
```

### Lazy Loading Components

```typescript
// ✅ Good: Lazy load non-critical components
const SettingsPanel = lazy(() =>
  import('./components/settings/settings-panel')
);

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <SettingsPanel />
    </Suspense>
  );
}
```

### Static Asset Optimization

```bash
# Optimize images
# Use PNG, JPEG, WebP formats
# Compress before adding to public/

# Optimize fonts
# Use WOFF2 format
# Subset fonts to used characters
```

### Production Environment Variables

```bash
# .env.production
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=Cognia

# Build-time variables (server-side only)
DATABASE_URL=postgresql://...

# Client-accessible variables (prefixed with NEXT_PUBLIC_)
NEXT_PUBLIC_API_URL=https://api.example.com
```

## Deployment Options

### Web Deployment

#### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod

# vercel.json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "out",
  "devCommand": "pnpm dev"
}
```

#### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy to Netlify
netlify deploy --prod --dir=out

# netlify.toml
[build]
  command = "pnpm build"
  publish = "out"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Static CDN

**AWS S3 + CloudFront**:

```bash
# Upload to S3
aws s3 sync out/ s3://my-bucket --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

**Azure Static Web Apps**:

```bash
# Deploy using Azure CLI
az staticwebapp deploy \
  --name my-app \
  --resource-group my-group \
  --source out/
```

**GitHub Pages**:

```bash
# Deploy using gh-pages
pnpm build
npx gh-pages -d out
```

### Desktop Application Distribution

#### GitHub Releases

Automated via GitHub Actions:

```yaml
# .github/workflows/ci.yml
create-release:
  needs: [build-tauri]
  runs-on: ubuntu-latest
  if: startsWith(github.ref, 'refs/tags/v')

  steps:
    - name: Create Release
      uses: softprops/action-gh-release@v1
      with:
        draft: true
        generate_release_notes: true
        files: |
          artifacts/**/*.AppImage
          artifacts/**/*.deb
          artifacts/**/*.msi
          artifacts/**/*.exe
          artifacts/**/*.dmg
```

#### Direct Download

Host installers on your website:

```bash
# Upload to website
scp src-tauri/target/release/bundle/msi/*.msi user@server:/var/www/downloads/

# Create download page with links to installers
```

#### App Stores

**Microsoft Store**:

- Requires Windows app packaging
- See: [Tauri MSIX Packaging](https://tauri.app/v1/guides/distribution/msix)

**Mac App Store**:

- Requires Apple Developer account
- See: [Tauri Mac App Store](https://tauri.app/v1/guides/distribution/mac-app-store)

### CI/CD Pipeline

GitHub Actions workflow handles:

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # 1. Code Quality
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm lint
      - run: pnpm exec tsc --noEmit

  # 2. Test Suite
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v4

  # 3. Build Web
  build-web:
    needs: [quality, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with:
          name: nextjs-build
          path: out/

  # 4. Build Desktop
  build-tauri:
    needs: [quality, test]
    strategy:
      matrix:
        include:
          - platform: ubuntu-latest
            target: x86_64-unknown-linux-gnu
          - platform: windows-latest
            target: x86_64-pc-windows-msvc
          - platform: macos-latest
            target: x86_64-apple-darwin
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - run: pnpm tauri build --target ${{ matrix.target }}
      - uses: actions/upload-artifact@v4
        with:
          name: tauri-${{ matrix.platform }}
          path: src-tauri/target/release/bundle/
```

---

**Last Updated**: December 25, 2025
