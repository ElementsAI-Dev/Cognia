/**
 * Native Providers - Desktop/Tauri functionality
 *
 * Provides native desktop features:
 * - System info, updates, deep links (NativeProvider)
 * - Secure storage with Stronghold (StrongholdProvider)
 */

// Native desktop functionality
export { NativeProvider, type NativeProviderProps } from './native-provider';
export { default as NativeProviderDefault } from './native-provider';

// Secure storage
export {
  StrongholdProvider,
  useStrongholdContext,
  useStrongholdOptional,
} from './stronghold-provider';
export { default as StrongholdProviderDefault } from './stronghold-provider';
