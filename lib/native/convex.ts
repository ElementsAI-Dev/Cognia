/**
 * Convex Native API - Tauri invoke wrappers for Convex cloud sync
 */

import { invokeWithTrace } from './invoke-with-trace';
import { isTauri } from '@/lib/utils';
import { normalizeConvexDeploymentUrl } from '@/lib/sync/convex-url';

export interface NativeConvexConfig {
  deploymentUrl: string;
  deployKey: string;
  enabled: boolean;
  syncIntervalSecs: number;
}

export async function getConvexConfig(): Promise<NativeConvexConfig | null> {
  if (!isTauri()) return null;
  return invokeWithTrace<NativeConvexConfig>('convex_get_config');
}

export async function setConvexConfig(config: NativeConvexConfig): Promise<boolean> {
  if (!isTauri()) return false;
  const normalizedConfig: NativeConvexConfig = {
    ...config,
    deploymentUrl: normalizeConvexDeploymentUrl(config.deploymentUrl),
    deployKey: config.deployKey.trim(),
  };
  return invokeWithTrace<boolean>('convex_set_config', { config: normalizedConfig });
}

export async function testConvexConnection(): Promise<boolean> {
  if (!isTauri()) return false;
  return invokeWithTrace<boolean>('convex_test_connection');
}

export async function isConvexConnected(): Promise<boolean> {
  if (!isTauri()) return false;
  return invokeWithTrace<boolean>('convex_is_connected');
}
