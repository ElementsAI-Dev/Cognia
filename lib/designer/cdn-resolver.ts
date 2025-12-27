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
};

export default cdnResolver;
