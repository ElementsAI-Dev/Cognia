/**
 * MCP Constants
 * Centralized constants for MCP-related functionality
 */

/** API Base URLs for different marketplaces */
export const MCP_API_URLS = {
  cline: 'https://core-api.staging.int.cline.bot/v1/mcp',
  smithery: 'https://registry.smithery.ai',
  glama: 'https://glama.ai/api/mcp',
} as const;

/** Request timeout in milliseconds */
export const MCP_REQUEST_TIMEOUT = 15000;

/** Maximum retry attempts for API requests */
export const MCP_MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms) */
export const MCP_BASE_RETRY_DELAY = 1000;

/** Maximum retry delay (ms) */
export const MCP_MAX_RETRY_DELAY = 10000;

/** User agent for API requests */
export const MCP_USER_AGENT = 'cognia-app';

/** Default page size for marketplace */
export const MCP_DEFAULT_PAGE_SIZE = 20;

/** Cache duration for marketplace details (10 minutes) */
export const MCP_DETAILS_CACHE_DURATION = 10 * 60 * 1000;

/** Maximum number of recently viewed items */
export const MCP_MAX_RECENTLY_VIEWED = 10;

/** Maximum number of favorites */
export const MCP_MAX_FAVORITES = 50;

/** Environment variable patterns for extraction */
export const MCP_ENV_VAR_PATTERNS = [
  /([A-Z][A-Z0-9_]{2,}_(?:KEY|TOKEN|SECRET|API_KEY|PASSWORD|CREDENTIAL))/g,
  /\$\{?([A-Z][A-Z0-9_]+)\}?/g,
  /process\.env\.([A-Z][A-Z0-9_]+)/g,
  /env\s*:\s*\{[^}]*["']([A-Z][A-Z0-9_]+)["']/g,
  /([A-Z][A-Z0-9_]*_API_KEY)/g,
] as const;

/** Maximum environment keys to extract from readme */
export const MCP_MAX_ENV_KEYS = 10;

/** Keyboard navigation keys */
export const MCP_NAVIGATION_KEYS = {
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  ENTER: 'Enter',
  SPACE: ' ',
  HOME: 'Home',
  END: 'End',
  ESCAPE: 'Escape',
} as const;

/** Source badge colors */
export const MCP_SOURCE_COLORS = {
  cline: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  smithery: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  glama: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
} as const;

/** Default commands for different runtimes */
export const MCP_DEFAULT_COMMANDS = {
  node: 'npx',
  python: 'uvx',
  docker: 'docker',
} as const;

/** Supported connection types */
export const MCP_CONNECTION_TYPES = ['stdio', 'sse'] as const;

/** Server status types */
export const MCP_STATUS_TYPES = [
  'disconnected',
  'connecting',
  'connected',
  'error',
  'reconnecting',
] as const;

/** All log levels in order of severity */
export const MCP_ALL_LOG_LEVELS = [
  'debug',
  'info',
  'notice',
  'warning',
  'error',
  'critical',
  'alert',
  'emergency',
] as const;
