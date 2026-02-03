'use client';

import React from 'react';
import { Search, LayoutGrid, TableIcon, Image, Wrench, Mic } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CATEGORY_CONFIG, PROVIDER_CATEGORIES, type ProviderCategory } from '@/lib/ai/providers/provider-helpers';
import { PROVIDERS } from '@/types/provider';

export type CapabilityFilter = 'vision' | 'tools' | 'audio';

interface ProviderFiltersProps {
  categoryFilter: ProviderCategory;
  onCategoryChange: (category: ProviderCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'cards' | 'table';
  onViewModeChange: (mode: 'cards' | 'table') => void;
  capabilityFilters?: CapabilityFilter[];
  onCapabilityFilterChange?: (filters: CapabilityFilter[]) => void;
}

export const ProviderFilters = React.memo(function ProviderFilters({
  categoryFilter,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  capabilityFilters = [],
  onCapabilityFilterChange,
}: ProviderFiltersProps) {
  const tPlaceholders = useTranslations('placeholders');
  const tModelPicker = useTranslations('modelPicker');
  const tProviders = useTranslations('providers');

  const toggleCapability = (cap: CapabilityFilter) => {
    if (!onCapabilityFilterChange) return;
    const newFilters = capabilityFilters.includes(cap)
      ? capabilityFilters.filter((c) => c !== cap)
      : [...capabilityFilters, cap];
    onCapabilityFilterChange(newFilters);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Tabs
        value={categoryFilter}
        onValueChange={(v) => onCategoryChange(v as ProviderCategory)}
        className="w-full sm:w-auto"
      >
        <TabsList className="h-8 p-0.5 bg-muted/50">
          {(Object.keys(CATEGORY_CONFIG) as ProviderCategory[]).map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const label =
              cat === 'specialized'
                ? tModelPicker('fast')
                : cat === 'all'
                  ? tModelPicker('all')
                  : tModelPicker(cat);
            const count =
              cat === 'all'
                ? Object.keys(PROVIDERS).length
                : Object.keys(PROVIDERS).filter((id) => PROVIDER_CATEGORIES[id] === cat).length;
            return (
              <TabsTrigger
                key={cat}
                value={cat}
                className="h-7 px-2.5 text-xs gap-1 data-[state=active]:bg-background"
              >
                {config.icon}
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden max-w-[56px] truncate">{label}</span>
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 sm:flex-none sm:w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={tPlaceholders('searchProviders')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 text-sm pl-10 sm:h-8"
            autoComplete="off"
            data-form-type="other"
            data-lpignore="true"
          />
        </div>

        {/* Capability Filters */}
        {onCapabilityFilterChange && (
          <div className="hidden sm:flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={capabilityFilters.includes('vision')}
                    onPressedChange={() => toggleCapability('vision')}
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label={tProviders('capabilityVision')}
                  >
                    <Image className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>{tProviders('capabilityVision')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={capabilityFilters.includes('tools')}
                    onPressedChange={() => toggleCapability('tools')}
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label={tProviders('capabilityTools')}
                  >
                    <Wrench className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>{tProviders('capabilityTools')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={capabilityFilters.includes('audio')}
                    onPressedChange={() => toggleCapability('audio')}
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label={tProviders('capabilityAudio')}
                  >
                    <Mic className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>{tProviders('capabilityAudio')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Hide table view toggle on mobile - cards only */}
        <div className="hidden sm:flex items-center border rounded-md">
          <Button
            variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-2 rounded-r-none"
            onClick={() => onViewModeChange('cards')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-2 rounded-l-none"
            onClick={() => onViewModeChange('table')}
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

export default ProviderFilters;
