/**
 * Side panel components
 * Layers and history management
 */

export { LayersPanel } from './layers-panel';
export type { LayersPanelProps } from './layers-panel';

export { HistoryPanel } from './history-panel';
export type { HistoryPanelProps } from './history-panel';

// Re-export types from canonical source
export type { Layer, LayerType, BlendMode, HistoryEntry, HistoryOperationType } from '@/types';
