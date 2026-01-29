/**
 * Export utilities for designer - Re-export export and CDN functionality
 */

export {
  type CDNProvider,
  type PackageInfo,
  type CDNConfig,
  type PackagePreset,
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
} from './cdn-resolver';

export {
  type ProjectFiles,
  type ExportConfig,
  type CodeSnippet,
  normalizeSandpackFiles,
  generateViteProject,
  openInCodeSandbox,
  openInStackBlitz,
  downloadAsZip,
  downloadFile,
  copyToClipboard,
  generateShareableUrl,
  createGitHubGist,
  encodeCodeForSharing,
  decodeSharedCode,
  generateCompactShareUrl,
  parseSharedUrl,
  generateEmbedCode,
  exportAsFormat,
  getQRCodeData,
  generateSocialShareLinks,
} from './export-utils';
