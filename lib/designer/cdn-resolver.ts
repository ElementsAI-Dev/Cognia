/**
 * CDN Resolver - Utility for converting npm packages to CDN URLs
 * Supports multiple CDN providers: esm.sh, skypack, unpkg, jsdelivr
 */

export type CDNProvider = 'esm.sh' | 'skypack' | 'unpkg' | 'jsdelivr';

export interface PackageInfo {
  name: string;
  version?: string;
  subpath?: string;
}

export interface CDNConfig {
  provider: CDNProvider;
  defaultVersion?: string;
}

// Popular packages with known CDN compatibility
const KNOWN_ESM_PACKAGES: Record<string, { esm: boolean; defaultExport?: string }> = {
  'react': { esm: true },
  'react-dom': { esm: true },
  'vue': { esm: true },
  'lodash': { esm: true },
  'axios': { esm: true },
  'dayjs': { esm: true },
  'date-fns': { esm: true },
  'framer-motion': { esm: true },
  'lucide-react': { esm: true },
  'clsx': { esm: true },
  'tailwind-merge': { esm: true },
  'class-variance-authority': { esm: true },
  '@radix-ui/react-slot': { esm: true },
  '@radix-ui/react-dialog': { esm: true },
  '@radix-ui/react-dropdown-menu': { esm: true },
  '@radix-ui/react-tabs': { esm: true },
  '@radix-ui/react-tooltip': { esm: true },
  '@radix-ui/react-accordion': { esm: true },
  '@radix-ui/react-collapsible': { esm: true },
  '@radix-ui/react-popover': { esm: true },
  '@radix-ui/react-select': { esm: true },
  '@radix-ui/react-checkbox': { esm: true },
  '@radix-ui/react-switch': { esm: true },
  '@radix-ui/react-slider': { esm: true },
  'zustand': { esm: true },
  'jotai': { esm: true },
  'recoil': { esm: true },
  'immer': { esm: true },
  'zod': { esm: true },
  'yup': { esm: true },
  'react-hook-form': { esm: true },
  'swr': { esm: true },
  'react-query': { esm: true },
  '@tanstack/react-query': { esm: true },
  'recharts': { esm: true },
  'chart.js': { esm: true },
  'react-chartjs-2': { esm: true },
  'd3': { esm: true },
  'three': { esm: true },
  '@react-three/fiber': { esm: true },
  '@react-three/drei': { esm: true },
  'gsap': { esm: true },
  'animejs': { esm: true },
  'uuid': { esm: true },
  'nanoid': { esm: true },
  'marked': { esm: true },
  'highlight.js': { esm: true },
  'prismjs': { esm: true },
  'react-markdown': { esm: true },
  'react-syntax-highlighter': { esm: true },
};

/**
 * Parse a package specifier (e.g., "react@18.2.0" or "@radix-ui/react-dialog@1.0.0")
 */
export function parsePackageSpecifier(specifier: string): PackageInfo {
  // Handle scoped packages (@org/package)
  let name: string;
  let version: string | undefined;
  let subpath: string | undefined;

  // Check if there's a subpath (e.g., lodash/debounce)
  const subpathMatch = specifier.match(/^([^/]+(?:\/[^@/]+)?)(\/.*)?$/);
  if (subpathMatch && subpathMatch[2]) {
    subpath = subpathMatch[2];
    specifier = subpathMatch[1];
  }

  if (specifier.startsWith('@')) {
    // Scoped package: @org/package@version
    const match = specifier.match(/^(@[^/]+\/[^@]+)(?:@(.+))?$/);
    if (match) {
      name = match[1];
      version = match[2];
    } else {
      name = specifier;
    }
  } else {
    // Regular package: package@version
    const atIndex = specifier.lastIndexOf('@');
    if (atIndex > 0) {
      name = specifier.slice(0, atIndex);
      version = specifier.slice(atIndex + 1);
    } else {
      name = specifier;
    }
  }

  return { name, version, subpath };
}

/**
 * Get CDN URL for a package
 */
export function getCDNUrl(
  packageInfo: PackageInfo,
  config: CDNConfig = { provider: 'esm.sh' }
): string {
  const { name, version, subpath } = packageInfo;
  const versionStr = version || config.defaultVersion || 'latest';
  const subpathStr = subpath || '';

  switch (config.provider) {
    case 'esm.sh':
      // esm.sh is great for ESM modules with React support
      return `https://esm.sh/${name}@${versionStr}${subpathStr}`;

    case 'skypack':
      // Skypack optimizes for browser usage
      return `https://cdn.skypack.dev/${name}@${versionStr}${subpathStr}`;

    case 'unpkg':
      // unpkg serves files directly from npm
      return `https://unpkg.com/${name}@${versionStr}${subpathStr}`;

    case 'jsdelivr':
      // jsdelivr with ESM support
      return `https://cdn.jsdelivr.net/npm/${name}@${versionStr}${subpathStr}/+esm`;

    default:
      return `https://esm.sh/${name}@${versionStr}${subpathStr}`;
  }
}

// CDN fallback order - prioritized by reliability and ESM support
const CDN_FALLBACK_ORDER: CDNProvider[] = ['esm.sh', 'skypack', 'jsdelivr', 'unpkg'];

// Cache for successful CDN resolutions
const cdnResolutionCache = new Map<string, string>();

/**
 * Get CDN URL with automatic fallback across multiple providers
 * Tries each CDN in order until one succeeds
 */
export async function getCDNUrlWithFallback(
  packageInfo: PackageInfo,
  options: { timeout?: number; useCache?: boolean } = {}
): Promise<string> {
  const { timeout = 5000, useCache = true } = options;
  const cacheKey = `${packageInfo.name}@${packageInfo.version || 'latest'}${packageInfo.subpath || ''}`;

  // Check cache first
  if (useCache && cdnResolutionCache.has(cacheKey)) {
    return cdnResolutionCache.get(cacheKey)!;
  }

  const errors: string[] = [];

  for (const provider of CDN_FALLBACK_ORDER) {
    try {
      const url = getCDNUrl(packageInfo, { provider });

      // Verify the URL is accessible with a HEAD request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Cache the successful resolution
        if (useCache) {
          cdnResolutionCache.set(cacheKey, url);
        }
        return url;
      }

      errors.push(`${provider}: HTTP ${response.status}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${provider}: ${errorMessage}`);
      continue;
    }
  }

  throw new Error(
    `Failed to resolve package "${packageInfo.name}" from any CDN:\n${errors.join('\n')}`
  );
}

/**
 * Batch resolve multiple packages with fallback
 * Runs in parallel for efficiency
 */
export async function batchResolveCDNUrls(
  packages: (string | PackageInfo)[],
  options: { timeout?: number; useCache?: boolean } = {}
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  const resolutions = await Promise.allSettled(
    packages.map(async (pkg) => {
      const packageInfo = typeof pkg === 'string' ? parsePackageSpecifier(pkg) : pkg;
      const url = await getCDNUrlWithFallback(packageInfo, options);
      return { name: packageInfo.name, url };
    })
  );

  for (const result of resolutions) {
    if (result.status === 'fulfilled') {
      results[result.value.name] = result.value.url;
    }
  }

  return results;
}

/**
 * Clear the CDN resolution cache
 */
export function clearCDNCache(): void {
  cdnResolutionCache.clear();
}

/**
 * Get cached CDN resolution count
 */
export function getCDNCacheSize(): number {
  return cdnResolutionCache.size;
}

/**
 * Generate import map for a list of packages
 */
export function generateImportMap(
  packages: (string | PackageInfo)[],
  config: CDNConfig = { provider: 'esm.sh' }
): Record<string, string> {
  const importMap: Record<string, string> = {};

  for (const pkg of packages) {
    const packageInfo = typeof pkg === 'string' ? parsePackageSpecifier(pkg) : pkg;
    const url = getCDNUrl(packageInfo, config);
    importMap[packageInfo.name] = url;
  }

  return importMap;
}

/**
 * Check if a package is known to be ESM compatible
 */
export function isKnownESMPackage(packageName: string): boolean {
  return packageName in KNOWN_ESM_PACKAGES;
}

/**
 * Get Sandpack-compatible external resources for CDN packages
 */
export function getSandpackExternalResources(
  packages: string[],
  config: CDNConfig = { provider: 'esm.sh' }
): string[] {
  return packages.map((pkg) => {
    const packageInfo = parsePackageSpecifier(pkg);
    return getCDNUrl(packageInfo, config);
  });
}

/**
 * Generate a Sandpack dependencies object from package list
 */
export function generateSandpackDependencies(
  packages: string[]
): Record<string, string> {
  const deps: Record<string, string> = {};

  for (const pkg of packages) {
    const { name, version } = parsePackageSpecifier(pkg);
    deps[name] = version || 'latest';
  }

  return deps;
}

/**
 * Common package presets for different project types
 */
export const PACKAGE_PRESETS = {
  'react-basic': [
    'react@18',
    'react-dom@18',
    'lucide-react',
    'clsx',
    'tailwind-merge',
  ],
  'react-ui': [
    'react@18',
    'react-dom@18',
    'lucide-react',
    'clsx',
    'tailwind-merge',
    'class-variance-authority',
    '@radix-ui/react-slot',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-tabs',
    '@radix-ui/react-tooltip',
    'framer-motion',
  ],
  'react-forms': [
    'react@18',
    'react-dom@18',
    'react-hook-form',
    'zod',
    '@hookform/resolvers',
  ],
  'react-data': [
    'react@18',
    'react-dom@18',
    '@tanstack/react-query',
    'axios',
    'zustand',
  ],
  'react-charts': [
    'react@18',
    'react-dom@18',
    'recharts',
    'date-fns',
  ],
  'vue-basic': [
    'vue@3',
    'lucide-vue-next',
  ],
} as const;

export type PackagePreset = keyof typeof PACKAGE_PRESETS;

/**
 * Get packages for a preset
 */
export function getPresetPackages(preset: PackagePreset): string[] {
  return [...PACKAGE_PRESETS[preset]];
}

/**
 * Detect required packages from code
 */
export function detectPackagesFromCode(code: string): string[] {
  const packages = new Set<string>();

  // Match import statements
  const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"./][^'"]*)['"]/g;
  let match;

  while ((match = importRegex.exec(code)) !== null) {
    const packageName = match[1];
    // Handle scoped packages and subpaths
    if (packageName.startsWith('@')) {
      // @org/package or @org/package/subpath
      const parts = packageName.split('/');
      packages.add(`${parts[0]}/${parts[1]}`);
    } else {
      // package or package/subpath
      packages.add(packageName.split('/')[0]);
    }
  }

  // Match require statements
  const requireRegex = /require\s*\(\s*['"]([^'"./][^'"]*)['"]\s*\)/g;
  while ((match = requireRegex.exec(code)) !== null) {
    const packageName = match[1];
    if (packageName.startsWith('@')) {
      const parts = packageName.split('/');
      packages.add(`${parts[0]}/${parts[1]}`);
    } else {
      packages.add(packageName.split('/')[0]);
    }
  }

  return Array.from(packages);
}

// ============================================================
// Core Library CDN Configuration with Fallbacks
// ============================================================

/**
 * Core library CDN URLs with multiple fallback options
 * Used for iframe previews where we need direct script tags
 */
export const CORE_LIBRARY_CDNS = {
  react: [
    'https://unpkg.com/react@18/umd/react.development.js',
    'https://cdn.jsdelivr.net/npm/react@18/umd/react.development.js',
    'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.development.min.js',
  ],
  reactDom: [
    'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
    'https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.development.js',
    'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.development.min.js',
  ],
  babel: [
    'https://unpkg.com/@babel/standalone/babel.min.js',
    'https://cdn.jsdelivr.net/npm/@babel/standalone/babel.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js',
  ],
  tailwind: [
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.js',
  ],
  lucideIcons: [
    'https://cdn.jsdelivr.net/npm/lucide-static@latest/font/lucide.min.css',
    'https://unpkg.com/lucide-static@latest/font/lucide.min.css',
  ],
} as const;

export type CoreLibrary = keyof typeof CORE_LIBRARY_CDNS;

// Cache for CDN health check results (5 minute TTL)
const cdnHealthCache = new Map<string, { available: boolean; timestamp: number }>();
const CDN_HEALTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a CDN URL is available
 * Results are cached for 5 minutes
 */
export async function checkCDNHealth(url: string, timeout = 3000): Promise<boolean> {
  const cached = cdnHealthCache.get(url);
  if (cached && Date.now() - cached.timestamp < CDN_HEALTH_CACHE_TTL) {
    return cached.available;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors', // Allow checking CDNs without CORS
    });

    clearTimeout(timeoutId);

    // For no-cors requests, response.ok might be false but status 0 means success
    const available = response.ok || response.type === 'opaque';
    cdnHealthCache.set(url, { available, timestamp: Date.now() });
    return available;
  } catch {
    cdnHealthCache.set(url, { available: false, timestamp: Date.now() });
    return false;
  }
}

/**
 * Get the first available CDN URL for a core library
 * Falls back through the list until one is available
 */
export async function getAvailableCDN(
  library: CoreLibrary,
  options: { timeout?: number; skipCheck?: boolean } = {}
): Promise<string> {
  const { timeout = 3000, skipCheck = false } = options;
  const urls = CORE_LIBRARY_CDNS[library];

  if (skipCheck) {
    return urls[0];
  }

  for (const url of urls) {
    const available = await checkCDNHealth(url, timeout);
    if (available) {
      return url;
    }
  }

  // Return first URL as fallback even if health check failed
  console.warn(`[CDN] All CDNs for ${library} failed health check, using primary`);
  return urls[0];
}

/**
 * Generate script tag with onerror fallback to next CDN
 * This allows client-side fallback when a CDN fails to load
 */
export function generateScriptTagWithFallback(
  library: CoreLibrary,
  options: { async?: boolean; crossorigin?: boolean } = {}
): string {
  const urls = CORE_LIBRARY_CDNS[library];
  const { async = false, crossorigin = true } = options;

  const asyncAttr = async ? ' async' : '';
  const crossoriginAttr = crossorigin ? ' crossorigin' : '';

  // Generate script with onerror fallback chain
  const fallbackChain = urls
    .map((url, index) => {
      if (index === 0) {
        // First script with onerror handler
        const fallbackScript = urls[1]
          ? `this.onerror=null;this.src='${urls[1]}';`
          : '';
        return `<script src="${url}"${asyncAttr}${crossoriginAttr} onerror="${fallbackScript}"><\/script>`;
      }
      return null;
    })
    .filter(Boolean)
    .join('\n');

  return fallbackChain;
}

/**
 * Generate all core library script tags with fallback support
 * Returns HTML string ready to inject into iframe head
 */
export function generateCoreLibraryScripts(options: {
  includeReact?: boolean;
  includeBabel?: boolean;
  includeTailwind?: boolean;
  includeLucide?: boolean;
} = {}): string {
  const {
    includeReact = true,
    includeBabel = true,
    includeTailwind = true,
    includeLucide = true,
  } = options;

  const scripts: string[] = [];

  if (includeReact) {
    scripts.push(generateScriptTagWithFallback('react'));
    scripts.push(generateScriptTagWithFallback('reactDom'));
  }

  if (includeBabel) {
    scripts.push(generateScriptTagWithFallback('babel'));
  }

  if (includeTailwind) {
    scripts.push(generateScriptTagWithFallback('tailwind'));
  }

  if (includeLucide) {
    const lucideUrls = CORE_LIBRARY_CDNS.lucideIcons;
    scripts.push(
      `<link rel="stylesheet" href="${lucideUrls[0]}" onerror="this.onerror=null;this.href='${lucideUrls[1]}'">`
    );
  }

  return scripts.join('\n    ');
}

/**
 * Clear CDN health cache
 */
export function clearCDNHealthCache(): void {
  cdnHealthCache.clear();
}

/**
 * Safe base64 encoding that handles Unicode characters
 * Replaces btoa() which fails on non-ASCII
 */
export function safeBase64Encode(str: string): string {
  try {
    // Convert to UTF-8 bytes then to base64
    const bytes = new TextEncoder().encode(str);
    const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    return btoa(binString);
  } catch {
    // Fallback for environments without TextEncoder
    return btoa(unescape(encodeURIComponent(str)));
  }
}

/**
 * Safe base64 decoding that handles Unicode characters
 */
export function safeBase64Decode(base64: string): string {
  try {
    const binString = atob(base64);
    const bytes = Uint8Array.from(binString, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    // Fallback
    return decodeURIComponent(escape(atob(base64)));
  }
}

const cdnResolver = {
  parsePackageSpecifier,
  getCDNUrl,
  getCDNUrlWithFallback,
  batchResolveCDNUrls,
  clearCDNCache,
  getCDNCacheSize,
  generateImportMap,
  isKnownESMPackage,
  getSandpackExternalResources,
  generateSandpackDependencies,
  getPresetPackages,
  detectPackagesFromCode,
  PACKAGE_PRESETS,
  // New exports
  CORE_LIBRARY_CDNS,
  checkCDNHealth,
  getAvailableCDN,
  generateScriptTagWithFallback,
  generateCoreLibraryScripts,
  clearCDNHealthCache,
  safeBase64Encode,
  safeBase64Decode,
};

export default cdnResolver;
