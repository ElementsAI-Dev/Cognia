'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Search, Filter, X, Check, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { TRANSPARENCY_CONFIG } from '@/lib/constants/transparency';
import type { PluginType, PluginCapability } from '@/types/plugin';

// Filter types from the parent page
export type FilterStatus = 'all' | 'enabled' | 'disabled' | 'error';
export type FilterType = PluginType | 'all';
export type FilterCapability = PluginCapability | 'all';
export type SortOption = 'name' | 'recent' | 'status';

interface PluginFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: FilterStatus;
  onStatusFilterChange: (status: FilterStatus) => void;
  typeFilter: FilterType;
  onTypeFilterChange: (type: FilterType) => void;
  capabilityFilter: FilterCapability;
  onCapabilityFilterChange: (cap: FilterCapability) => void;
  className?: string;
  onResetFilters: () => void;
  activeCount: number;
  isBackgroundActive?: boolean;
}

export function PluginFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  capabilityFilter,
  onCapabilityFilterChange,
  className,
  onResetFilters,
  activeCount,
  isBackgroundActive = false,
}: PluginFilterBarProps) {
  const t = useTranslations('pluginSettings.filters');

  // Helper to get labels (mocking t function behavior for keys)
  const getStatusLabel = (s: FilterStatus) => {
    switch (s) {
      case 'all':
        return 'All Status';
      case 'enabled':
        return 'Enabled';
      case 'disabled':
        return 'Disabled';
      case 'error':
        return 'Error';
    }
  };

  const hasActiveFilters =
    statusFilter !== 'all' || typeFilter !== 'all' || capabilityFilter !== 'all';

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2',
        className
      )}
    >
      {/* Search Input - Enhanced with focus ring */}
      <div className="relative flex-1 w-full sm:max-w-xs lg:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={t('searchPlaceholder') || 'Search plugins...'}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            'pl-9 pr-9 h-8 text-sm rounded-lg transition-colors',
            isBackgroundActive ? TRANSPARENCY_CONFIG.interactive : 'bg-background'
          )}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-muted rounded-md"
            onClick={() => onSearchChange('')}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Filter Buttons - Scrollable on mobile */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
        {/* Status Filter - Enhanced */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 px-2.5 text-xs border-border/60 rounded-lg transition-all duration-200 shrink-0',
                statusFilter !== 'all' && 'bg-primary/10 border-primary/30 text-primary',
                isBackgroundActive && TRANSPARENCY_CONFIG.interactive
              )}
            >
              <Filter className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{statusFilter === 'all' ? 'Status' : getStatusLabel(statusFilter)}</span>
              <span className="sm:hidden">{statusFilter === 'all' ? 'Status' : statusFilter.charAt(0).toUpperCase()}</span>
              {statusFilter !== 'all' && <div className="ml-1.5 rounded-full bg-primary w-2 h-2" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[180px] p-1" align="start">
            <Command>
              <CommandList>
                <CommandGroup>
                  {(['all', 'enabled', 'disabled', 'error'] as FilterStatus[]).map((status) => (
                    <CommandItem
                      key={status}
                      onSelect={() => onStatusFilterChange(status)}
                      className="flex items-center justify-between px-3 py-2 rounded-md"
                    >
                      <span>{getStatusLabel(status)}</span>
                      {statusFilter === status && <Check className="h-4 w-4 text-primary" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Type Filter - Enhanced */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 px-2.5 text-xs border-border/60 rounded-lg transition-all duration-200 shrink-0',
                typeFilter !== 'all' && 'bg-primary/10 border-primary/30 text-primary',
                isBackgroundActive && TRANSPARENCY_CONFIG.interactive
              )}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{typeFilter === 'all' ? 'Type' : typeFilter}</span>
              <span className="sm:hidden">Type</span>
              {typeFilter !== 'all' && <div className="ml-1.5 rounded-full bg-primary w-2 h-2" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[160px] p-1" align="start">
            <Command>
              <CommandList>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onTypeFilterChange('all')}
                    className="justify-between px-3 py-2 rounded-md"
                  >
                    All Types
                    {typeFilter === 'all' && <Check className="h-4 w-4 text-primary" />}
                  </CommandItem>
                  <CommandSeparator className="my-1" />
                  <CommandItem
                    onSelect={() => onTypeFilterChange('frontend')}
                    className="justify-between px-3 py-2 rounded-md"
                  >
                    Frontend
                    {typeFilter === 'frontend' && <Check className="h-4 w-4 text-primary" />}
                  </CommandItem>
                  <CommandItem
                    onSelect={() => onTypeFilterChange('python')}
                    className="justify-between px-3 py-2 rounded-md"
                  >
                    Python
                    {typeFilter === 'python' && <Check className="h-4 w-4 text-primary" />}
                  </CommandItem>
                  <CommandItem
                    onSelect={() => onTypeFilterChange('hybrid')}
                    className="justify-between px-3 py-2 rounded-md"
                  >
                    Hybrid
                    {typeFilter === 'hybrid' && <Check className="h-4 w-4 text-primary" />}
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Capability Filter - Enhanced */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 px-2.5 text-xs border-border/60 rounded-lg transition-all duration-200 shrink-0',
                capabilityFilter !== 'all' && 'bg-primary/10 border-primary/30 text-primary',
                isBackgroundActive && TRANSPARENCY_CONFIG.interactive
              )}
            >
              <Check className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{capabilityFilter === 'all' ? 'Capability' : capabilityFilter}</span>
              <span className="sm:hidden">Cap</span>
              {capabilityFilter !== 'all' && <div className="ml-1.5 rounded-full bg-primary w-2 h-2" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[180px] p-1" align="start">
            <Command>
              <CommandList>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onCapabilityFilterChange('all')}
                    className="justify-between px-3 py-2 rounded-md"
                  >
                    All Capabilities
                    {capabilityFilter === 'all' && <Check className="h-4 w-4 text-primary" />}
                  </CommandItem>
                  <CommandSeparator className="my-1" />
                  <CommandItem
                    onSelect={() => onCapabilityFilterChange('tools')}
                    className="justify-between px-3 py-2 rounded-md"
                  >
                    Tools
                    {capabilityFilter === 'tools' && <Check className="h-4 w-4 text-primary" />}
                  </CommandItem>
                  <CommandItem
                    onSelect={() => onCapabilityFilterChange('components')}
                    className="justify-between px-3 py-2 rounded-md"
                  >
                    Components
                    {capabilityFilter === 'components' && <Check className="h-4 w-4 text-primary" />}
                  </CommandItem>
                  <CommandItem
                    onSelect={() => onCapabilityFilterChange('modes')}
                    className="justify-between px-3 py-2 rounded-md"
                  >
                    Modes
                    {capabilityFilter === 'modes' && <Check className="h-4 w-4 text-primary" />}
                  </CommandItem>
                  <CommandItem
                    onSelect={() => onCapabilityFilterChange('skills')}
                    className="justify-between px-3 py-2 rounded-md"
                  >
                    Skills
                    {capabilityFilter === 'skills' && <Check className="h-4 w-4 text-primary" />}
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Reset and Count */}
        {(hasActiveFilters || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors shrink-0"
          >
            <X className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        )}

        {activeCount > 0 && !hasActiveFilters && !searchQuery && (
          <span className="text-xs text-muted-foreground whitespace-nowrap hidden lg:inline-flex items-center px-2 py-1 rounded-md bg-muted/50">
            {activeCount} plugins
          </span>
        )}
      </div>
    </div>
  );
}
