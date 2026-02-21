/**
 * Shared runtime adapter for Transformers.js UI/hooks integration.
 * Centralizes device/dtype/cache resolution and progress status mapping.
 */

import type {
  ModelDownloadProgress,
  TransformersDevice,
  TransformersDtype,
  TransformersModelState,
  TransformersSettings,
} from '@/types/transformers';
import { isWebGPUAvailable } from './transformers-manager';

export interface TransformersRuntimeResolvedOptions {
  device: TransformersDevice;
  dtype: TransformersDtype;
  cachePolicy: {
    enabled: boolean;
    maxCachedModels: number;
  };
}

export function resolveTransformersDevice(
  settings: Pick<TransformersSettings, 'preferWebGPU'>,
  preferredDevice?: TransformersDevice
): TransformersDevice {
  if (preferredDevice) {
    return preferredDevice;
  }
  return settings.preferWebGPU && isWebGPUAvailable() ? 'webgpu' : 'wasm';
}

export function resolveTransformersDtype(
  settings: Pick<TransformersSettings, 'defaultDtype'>,
  preferredDtype?: TransformersDtype
): TransformersDtype {
  return preferredDtype ?? settings.defaultDtype;
}

export function resolveTransformersRuntimeOptions(
  settings: Pick<TransformersSettings, 'preferWebGPU' | 'defaultDtype' | 'cacheModels' | 'maxCachedModels'>,
  overrides?: {
    device?: TransformersDevice;
    dtype?: TransformersDtype;
  }
): TransformersRuntimeResolvedOptions {
  return {
    device: resolveTransformersDevice(settings, overrides?.device),
    dtype: resolveTransformersDtype(settings, overrides?.dtype),
    cachePolicy: {
      enabled: settings.cacheModels,
      maxCachedModels: settings.maxCachedModels,
    },
  };
}

export function mapTransformersProgressStatus(
  status: ModelDownloadProgress['status']
): TransformersModelState['status'] {
  if (status === 'ready') return 'ready';
  if (status === 'error') return 'error';
  if (status === 'loading') return 'loading';
  return 'downloading';
}

export function syncTransformersManagerRuntime(
  manager: {
    syncFromTransformersSettings: (settings: Pick<TransformersSettings, 'cacheModels' | 'maxCachedModels'>) => void;
  },
  settings: Pick<TransformersSettings, 'cacheModels' | 'maxCachedModels'>
): void {
  manager.syncFromTransformersSettings(settings);
}
