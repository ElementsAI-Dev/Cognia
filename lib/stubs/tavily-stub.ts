/**
 * Browser/SSR stub for @tavily/core
 * Tavily uses Node.js-only dependencies (agent-base, https-proxy-agent) that require 'net' and 'tls'.
 * At runtime, the actual module is used only on the server or in Tauri.
 */

import { loggers } from '@/lib/logger';

const log = loggers.app;

const notAvailable = () => {
  log.warn('@tavily/core is not available in browser environment');
  throw new Error('@tavily/core is not available in browser environment');
};

export function tavily(_config: unknown) {
  return {
    search: notAvailable,
    extract: notAvailable,
    searchQNA: notAvailable,
  };
}

const tavilyStub = { tavily };
export default tavilyStub;
