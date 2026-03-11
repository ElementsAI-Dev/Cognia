import type {
  DetectedProxy,
  ManualProxyConfig,
  ProxyConfig,
  ProxyMode,
  ProxySoftware,
} from '@/types/system/proxy';
import { buildProxyUrl } from '@/types/system/proxy';

export interface SystemProxySnapshot {
  enabled: boolean;
  httpProxy: string | null;
  httpsProxy: string | null;
  socksProxy: string | null;
  noProxy: string | null;
}

export interface ManualProxyValidationResult {
  valid: boolean;
  error: string | null;
}

export interface ProxyResolutionResult {
  mode: ProxyMode;
  proxyUrl: string | null;
  error: string | null;
  selectedProxy?: ProxySoftware;
}

const PROXY_PROTOCOL_RE = /^(https?|socks4|socks5):\/\//i;

export function normalizeProxyUrl(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (PROXY_PROTOCOL_RE.test(normalized)) {
    return normalized;
  }
  return `http://${normalized}`;
}

export function validateManualProxyConfig(
  config?: ManualProxyConfig
): ManualProxyValidationResult {
  if (!config) {
    return { valid: false, error: 'Manual proxy configuration is missing' };
  }

  if (!['http', 'https', 'socks4', 'socks5'].includes(config.protocol)) {
    return { valid: false, error: 'Invalid proxy protocol' };
  }

  if (!config.host?.trim()) {
    return { valid: false, error: 'Proxy host is required' };
  }

  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    return { valid: false, error: 'Proxy port must be between 1 and 65535' };
  }

  if ((config.username && !config.password) || (!config.username && config.password)) {
    return {
      valid: false,
      error: 'Username and password must both be provided when using proxy auth',
    };
  }

  return { valid: true, error: null };
}

export function dedupeDetectedProxies(proxies: DetectedProxy[]): DetectedProxy[] {
  const bySoftware = new Map<ProxySoftware, DetectedProxy>();

  for (const proxy of proxies) {
    const existing = bySoftware.get(proxy.software);
    if (!existing) {
      bySoftware.set(proxy.software, proxy);
      continue;
    }

    const existingScore = scoreDetectedProxy(existing);
    const nextScore = scoreDetectedProxy(proxy);
    if (nextScore >= existingScore) {
      bySoftware.set(proxy.software, proxy);
    }
  }

  return Array.from(bySoftware.values());
}

function scoreDetectedProxy(proxy: DetectedProxy): number {
  let score = 0;
  if (proxy.running) score += 10;
  if (proxy.mixedPort) score += 4;
  if (proxy.httpPort) score += 2;
  if (proxy.socksPort) score += 1;
  return score;
}

export function buildDetectedProxyUrl(proxy: DetectedProxy): string | null {
  if (!proxy.running) return null;

  const port = proxy.mixedPort || proxy.httpPort;
  if (!port) return null;

  return `http://127.0.0.1:${port}`;
}

export function pickAutoSelectedProxy(
  selectedProxy: ProxySoftware | undefined,
  proxies: DetectedProxy[]
): ProxySoftware | undefined {
  const deduped = dedupeDetectedProxies(proxies);
  const runnable = deduped.filter((proxy) => !!buildDetectedProxyUrl(proxy));

  if (selectedProxy && runnable.some((proxy) => proxy.software === selectedProxy)) {
    return selectedProxy;
  }

  return runnable[0]?.software;
}

export function pickPreferredSystemProxyUrl(
  settings?: SystemProxySnapshot | null
): string | null {
  if (!settings?.enabled) {
    return null;
  }

  return (
    normalizeProxyUrl(settings.httpProxy) ||
    normalizeProxyUrl(settings.httpsProxy) ||
    normalizeProxyUrl(settings.socksProxy)
  );
}

export function resolveEffectiveProxy(
  config: ProxyConfig,
  proxies: DetectedProxy[],
  options?: {
    systemProxy?: SystemProxySnapshot | null;
    systemError?: string | null;
  }
): ProxyResolutionResult {
  if (!config.enabled || config.mode === 'off') {
    return {
      mode: config.mode,
      proxyUrl: null,
      error: null,
    };
  }

  if (config.mode === 'manual') {
    const validation = validateManualProxyConfig(config.manual);
    if (!validation.valid || !config.manual) {
      return {
        mode: config.mode,
        proxyUrl: null,
        error: validation.error,
      };
    }
    return {
      mode: config.mode,
      proxyUrl: buildProxyUrl(config.manual),
      error: null,
    };
  }

  if (config.mode === 'auto') {
    const selectedProxy = pickAutoSelectedProxy(config.selectedProxy, proxies);
    if (!selectedProxy) {
      return {
        mode: config.mode,
        proxyUrl: null,
        error: 'No running auto-detected proxy is available',
      };
    }

    const detected = dedupeDetectedProxies(proxies).find(
      (proxy) => proxy.software === selectedProxy
    );
    const proxyUrl = detected ? buildDetectedProxyUrl(detected) : null;
    if (!proxyUrl) {
      return {
        mode: config.mode,
        proxyUrl: null,
        error: 'Selected proxy is not available',
        selectedProxy,
      };
    }

    return {
      mode: config.mode,
      proxyUrl,
      error: null,
      selectedProxy,
    };
  }

  if (config.mode === 'system') {
    if (options?.systemError) {
      return {
        mode: config.mode,
        proxyUrl: null,
        error: options.systemError,
      };
    }

    const proxyUrl = pickPreferredSystemProxyUrl(options?.systemProxy);
    if (!proxyUrl) {
      return {
        mode: config.mode,
        proxyUrl: null,
        error: 'System proxy is not configured',
      };
    }

    return {
      mode: config.mode,
      proxyUrl,
      error: null,
    };
  }

  return {
    mode: config.mode,
    proxyUrl: null,
    error: null,
  };
}
