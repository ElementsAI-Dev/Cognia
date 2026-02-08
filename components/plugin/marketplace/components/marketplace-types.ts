/**
 * Marketplace Types - Shared types for marketplace components
 */

import type { PluginCapability, PluginType } from '@/types/plugin';

export interface MarketplacePlugin {
  id: string;
  name: string;
  description: string;
  author: {
    name: string;
    avatar?: string;
    verified?: boolean;
    url?: string;
  };
  version: string;
  type: PluginType;
  capabilities: PluginCapability[];
  rating: number;
  reviewCount: number;
  downloadCount: number;
  lastUpdated: string;
  tags: string[];
  icon?: string;
  banner?: string;
  featured?: boolean;
  trending?: boolean;
  verified?: boolean;
  price?: number;
  installed?: boolean;
  // Extended fields for detail view
  repository?: string;
  homepage?: string;
  documentation?: string;
  license?: string;
  downloadUrl?: string;
  screenshots?: string[];
  readme?: string;
  minAppVersion?: string;
  changelog?: ChangelogEntry[];
  reviews?: PluginReview[];
  ratingBreakdown?: Record<number, number>;
}

export interface PluginReview {
  id: string;
  author: string;
  avatar?: string;
  rating: number;
  date: string;
  content: string;
  helpful: number;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  breaking?: boolean;
}

export type ViewMode = 'grid' | 'list';
export type SortOption = 'popular' | 'rating' | 'recent' | 'downloads';
export type CategoryFilter = 'all' | PluginCapability;
export type QuickFilter = 'all' | 'verified' | 'free' | 'new' | 'popular';

export interface PluginCollection {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  pluginIds: string[];
  gradient: string;
}

export interface PluginCardProps {
  plugin: MarketplacePlugin;
  onInstall?: (pluginId: string) => Promise<void>;
  onViewDetails?: (plugin: MarketplacePlugin) => void;
  installProgress?: number;
  isInstalling?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (pluginId: string) => void;
}

export type InstallStage = 'idle' | 'downloading' | 'extracting' | 'installing' | 'configuring' | 'complete' | 'error';

export interface InstallProgressInfo {
  pluginId: string;
  stage: InstallStage;
  progress: number;
  message: string;
  error?: string;
}
