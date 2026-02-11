/**
 * Marketplace Constants - Shared constants for marketplace components
 */

import React from 'react';
import {
  Grid3X3,
  Wrench,
  Layers,
  Zap,
  Code2,
  Palette,
  Terminal,
  LayoutGrid,
  FileCode2,
  Package,
  Shield,
  Sparkles,
  Clock,
  TrendingUp,
} from 'lucide-react';
import type { CategoryFilter, QuickFilter, PluginCollection } from './marketplace-types';

export const CATEGORY_INFO: Record<CategoryFilter, { icon: React.ElementType; label: string; color: string }> = {
  all: { icon: Grid3X3, label: 'All', color: 'bg-slate-500' },
  tools: { icon: Wrench, label: 'Tools', color: 'bg-blue-500' },
  components: { icon: Layers, label: 'Components', color: 'bg-purple-500' },
  modes: { icon: Zap, label: 'Modes', color: 'bg-amber-500' },
  skills: { icon: Code2, label: 'Skills', color: 'bg-emerald-500' },
  themes: { icon: Palette, label: 'Themes', color: 'bg-pink-500' },
  commands: { icon: Terminal, label: 'Commands', color: 'bg-cyan-500' },
  hooks: { icon: Code2, label: 'Hooks', color: 'bg-indigo-500' },
  processors: { icon: Code2, label: 'Processors', color: 'bg-orange-500' },
  providers: { icon: Code2, label: 'Providers', color: 'bg-teal-500' },
  exporters: { icon: Code2, label: 'Exporters', color: 'bg-rose-500' },
  importers: { icon: Code2, label: 'Importers', color: 'bg-lime-500' },
  a2ui: { icon: LayoutGrid, label: 'A2UI', color: 'bg-violet-500' },
  python: { icon: FileCode2, label: 'Python', color: 'bg-yellow-500' },
  scheduler: { icon: Clock, label: 'Scheduler', color: 'bg-sky-500' },
};

export const QUICK_FILTERS: { id: QuickFilter; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', icon: Package },
  { id: 'verified', label: 'Verified', icon: Shield },
  { id: 'free', label: 'Free', icon: Sparkles },
  { id: 'new', label: 'New', icon: Clock },
  { id: 'popular', label: 'Popular', icon: TrendingUp },
];

export const PLUGIN_COLLECTIONS: PluginCollection[] = [
  {
    id: 'developer-essentials',
    name: 'Developer Essentials',
    description: 'Must-have plugins for developers',
    icon: Code2,
    pluginIds: ['cognia-web-search', 'git-assistant', 'api-tester'],
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'productivity-boost',
    name: 'Productivity Boost',
    description: 'Supercharge your workflow',
    icon: Zap,
    pluginIds: ['cognia-web-search', 'markdown-plus'],
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    id: 'creative-suite',
    name: 'Creative Suite',
    description: 'Tools for creative professionals',
    icon: Palette,
    pluginIds: ['theme-studio', 'ai-image-gen', 'data-visualizer'],
    gradient: 'from-purple-500 to-pink-500',
  },
];

export const MARKETPLACE_STATS = {
  totalPlugins: 1250,
  totalDownloads: 3500000,
  totalDevelopers: 320,
  weeklyNewPlugins: 12,
};

// Re-export mock data from isolated file for backward compatibility
export { MOCK_PLUGINS, MOCK_REVIEWS, MOCK_CHANGELOG } from './marketplace-mock-data';
