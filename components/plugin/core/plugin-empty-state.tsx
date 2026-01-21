'use client';

/**
 * PluginEmptyState - Enhanced empty state for plugin list
 * Features: Engaging illustrations, quick actions, and helpful suggestions
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Puzzle,
  Plus,
  Store,
  Search,
  FolderOpen,
  Sparkles,
  ArrowRight,
  Code2,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EmptyStateVariant = 'no-plugins' | 'no-results' | 'no-enabled' | 'no-disabled';

interface PluginEmptyStateProps {
  variant: EmptyStateVariant;
  searchQuery?: string;
  onCreatePlugin?: () => void;
  onBrowseMarketplace?: () => void;
  onImportPlugin?: () => void;
  onClearFilters?: () => void;
  className?: string;
}

const illustrations: Record<EmptyStateVariant, React.ReactNode> = {
  'no-plugins': (
    <div className="relative">
      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center animate-pulse">
        <Puzzle className="h-12 w-12 sm:h-16 sm:w-16 text-primary/40" />
      </div>
      <div className="absolute -bottom-1 -right-1 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 flex items-center justify-center">
        <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
      </div>
    </div>
  ),
  'no-results': (
    <div className="relative">
      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent flex items-center justify-center">
        <Search className="h-12 w-12 sm:h-16 sm:w-16 text-amber-500/40" />
      </div>
      <div className="absolute -bottom-1 -right-1 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted/80 flex items-center justify-center">
        <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
      </div>
    </div>
  ),
  'no-enabled': (
    <div className="relative">
      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent flex items-center justify-center">
        <Puzzle className="h-12 w-12 sm:h-16 sm:w-16 text-blue-500/40" />
      </div>
      <div className="absolute -bottom-1 -right-1 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-green-500/30 to-green-500/10 flex items-center justify-center">
        <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
      </div>
    </div>
  ),
  'no-disabled': (
    <div className="relative">
      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-slate-500/20 via-slate-500/10 to-transparent flex items-center justify-center">
        <Puzzle className="h-12 w-12 sm:h-16 sm:w-16 text-slate-500/40" />
      </div>
    </div>
  ),
};

export function PluginEmptyState({
  variant,
  searchQuery,
  onCreatePlugin,
  onBrowseMarketplace,
  onImportPlugin,
  onClearFilters,
  className,
}: PluginEmptyStateProps) {
  const t = useTranslations('pluginEmptyState');

  const renderContent = () => {
    switch (variant) {
      case 'no-plugins':
        return (
          <>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">
              {t('noPlugins.title')}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              {t('noPlugins.description')}
            </p>
            
            {/* Quick Actions Grid */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 w-full max-w-lg mb-8">
              <button
                onClick={onBrowseMarketplace}
                className="group flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium">{t('noPlugins.browseMarketplace')}</span>
              </button>
              
              <button
                onClick={onCreatePlugin}
                className="group flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
              >
                <div className="p-2.5 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                  <Code2 className="h-5 w-5 text-emerald-500" />
                </div>
                <span className="text-sm font-medium">{t('noPlugins.createPlugin')}</span>
              </button>
              
              <button
                onClick={onImportPlugin}
                className="group flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
              >
                <div className="p-2.5 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <FolderOpen className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-sm font-medium">{t('noPlugins.importPlugin')}</span>
              </button>
            </div>

            {/* Suggestion */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lightbulb className="h-4 w-4" />
              <span>{t('noPlugins.tip')}</span>
            </div>
          </>
        );

      case 'no-results':
        return (
          <>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">
              {t('noResults.title')}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              {searchQuery 
                ? t('noResults.searchDescription', { query: searchQuery })
                : t('noResults.filterDescription')
              }
            </p>
            
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {onClearFilters && (
                <Button variant="outline" size="sm" onClick={onClearFilters}>
                  {t('noResults.clearFilters')}
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={onBrowseMarketplace}>
                <Store className="h-4 w-4 mr-2" />
                {t('noResults.browseMore')}
              </Button>
            </div>

            {/* Search Suggestions */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-3">{t('noResults.suggestions')}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['tools', 'themes', 'ai', 'code'].map((term) => (
                  <Button
                    key={term}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                  >
                    <Search className="h-3 w-3" />
                    {term}
                  </Button>
                ))}
              </div>
            </div>
          </>
        );

      case 'no-enabled':
        return (
          <>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">
              {t('noEnabled.title')}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              {t('noEnabled.description')}
            </p>
            
            <Button onClick={onClearFilters}>
              {t('noEnabled.viewAll')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </>
        );

      case 'no-disabled':
        return (
          <>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">
              {t('noDisabled.title')}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              {t('noDisabled.description')}
            </p>
            
            <Button variant="outline" onClick={onClearFilters}>
              {t('noDisabled.viewAll')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </>
        );
    }
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 sm:py-16 px-4',
      className
    )}>
      <div className="mb-6">
        {illustrations[variant]}
      </div>
      {renderContent()}
    </div>
  );
}

export default PluginEmptyState;
