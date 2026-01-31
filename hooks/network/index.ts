/**
 * Network/Proxy related hooks
 */

export { useNetworkStatus, useApiHealth, type NetworkStatus } from './use-network-status';
export { useProxy, type UseProxyReturn } from './use-proxy';
export {
  useProxyHealthMonitor,
  useProxyHealthStatus,
  type ProxyHealthMonitorConfig,
  type ProxyHealthStatus,
  type UseProxyHealthMonitorReturn,
} from './use-proxy-health';
export {
  useGeolocation,
  useLocaleDetection,
  type UseGeolocationState,
  type UseGeolocationOptions,
  type UseGeolocationReturn,
  type UseLocaleDetectionState,
  type UseLocaleDetectionReturn,
} from './use-geolocation';
