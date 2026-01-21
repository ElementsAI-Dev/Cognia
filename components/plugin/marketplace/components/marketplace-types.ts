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
}
