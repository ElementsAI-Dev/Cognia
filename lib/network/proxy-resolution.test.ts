import type { DetectedProxy, ProxyConfig } from '@/types/system/proxy';
import {
  buildDetectedProxyUrl,
  dedupeDetectedProxies,
  normalizeProxyUrl,
  pickAutoSelectedProxy,
  pickPreferredSystemProxyUrl,
  resolveEffectiveProxy,
  validateManualProxyConfig,
} from './proxy-resolution';

function createBaseConfig(): ProxyConfig {
  return {
    mode: 'off',
    enabled: false,
    testUrl: 'https://example.com',
    autoDetectInterval: 30,
    healthCheckInterval: 60,
    testEndpoints: [],
  };
}

describe('proxy-resolution', () => {
  it('normalizes proxy urls without protocol', () => {
    expect(normalizeProxyUrl('127.0.0.1:7890')).toBe('http://127.0.0.1:7890');
    expect(normalizeProxyUrl('https://proxy.local:443')).toBe('https://proxy.local:443');
  });

  it('validates manual proxy config', () => {
    expect(
      validateManualProxyConfig({ protocol: 'http', host: '127.0.0.1', port: 7890 }).valid
    ).toBe(true);
    expect(
      validateManualProxyConfig({ protocol: 'http', host: '', port: 7890 }).valid
    ).toBe(false);
    expect(
      validateManualProxyConfig({
        protocol: 'http',
        host: '127.0.0.1',
        port: 7890,
        username: 'u',
      }).valid
    ).toBe(false);
  });

  it('deduplicates detected proxies preferring runnable entries', () => {
    const deduped = dedupeDetectedProxies([
      { software: 'clash', name: 'Clash', icon: '', running: false },
      { software: 'clash', name: 'Clash', icon: '', running: true, mixedPort: 7890 },
    ] as DetectedProxy[]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].running).toBe(true);
    expect(deduped[0].mixedPort).toBe(7890);
  });

  it('builds detected proxy url only for running proxies with ports', () => {
    expect(
      buildDetectedProxyUrl({
        software: 'clash',
        name: 'Clash',
        icon: '',
        running: true,
        mixedPort: 7890,
      })
    ).toBe('http://127.0.0.1:7890');
    expect(
      buildDetectedProxyUrl({
        software: 'clash',
        name: 'Clash',
        icon: '',
        running: false,
        mixedPort: 7890,
      })
    ).toBeNull();
  });

  it('selects deterministic auto proxy fallback', () => {
    const proxies: DetectedProxy[] = [
      { software: 'clash', name: 'Clash', icon: '', running: true, mixedPort: 7890 },
      { software: 'v2ray', name: 'V2Ray', icon: '', running: true, httpPort: 10809 },
    ];

    expect(pickAutoSelectedProxy('clash', proxies)).toBe('clash');
    expect(pickAutoSelectedProxy('shadowsocks', proxies)).toBe('clash');
  });

  it('picks preferred system proxy url', () => {
    expect(
      pickPreferredSystemProxyUrl({
        enabled: true,
        httpProxy: null,
        httpsProxy: 'proxy.example:443',
        socksProxy: null,
        noProxy: null,
      })
    ).toBe('http://proxy.example:443');
  });

  it('resolves manual mode proxy', () => {
    const config: ProxyConfig = {
      ...createBaseConfig(),
      enabled: true,
      mode: 'manual',
      manual: { protocol: 'http', host: '127.0.0.1', port: 7890 },
    };

    const result = resolveEffectiveProxy(config, []);
    expect(result.proxyUrl).toBe('http://127.0.0.1:7890');
    expect(result.error).toBeNull();
  });

  it('resolves auto mode with fallback selection', () => {
    const config: ProxyConfig = {
      ...createBaseConfig(),
      enabled: true,
      mode: 'auto',
      selectedProxy: 'v2ray',
    };
    const proxies: DetectedProxy[] = [
      { software: 'clash', name: 'Clash', icon: '', running: true, mixedPort: 7890 },
    ];

    const result = resolveEffectiveProxy(config, proxies);
    expect(result.proxyUrl).toBe('http://127.0.0.1:7890');
    expect(result.selectedProxy).toBe('clash');
  });

  it('resolves system mode and returns actionable error when missing', () => {
    const config: ProxyConfig = {
      ...createBaseConfig(),
      enabled: true,
      mode: 'system',
    };

    expect(resolveEffectiveProxy(config, []).error).toBe('System proxy is not configured');

    const result = resolveEffectiveProxy(config, [], {
      systemProxy: {
        enabled: true,
        httpProxy: '127.0.0.1:7890',
        httpsProxy: null,
        socksProxy: null,
        noProxy: null,
      },
    });
    expect(result.proxyUrl).toBe('http://127.0.0.1:7890');
  });
});
