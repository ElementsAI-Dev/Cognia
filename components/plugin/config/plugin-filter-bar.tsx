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
        'flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-2 p-1',
        className
      )}
    >
      <div className="relative flex-1 w-full sm:max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('searchPlaceholder') || 'Search plugins by name or ID...'}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            'pl-9 h-9 transition-colors',
            isBackgroundActive ? TRANSPARENCY_CONFIG.interactive : 'bg-background'
          )}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
            onClick={() => onSearchChange('')}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide mask-fade-right">
        {/* Status Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-9 border-dashed transition-colors',
                statusFilter !== 'all' && 'bg-accent/50 border-solid',
                isBackgroundActive && TRANSPARENCY_CONFIG.interactive
              )}
            >
              <Filter className="mr-2 h-4 w-4" />
              {statusFilter === 'all' ? 'Status' : getStatusLabel(statusFilter)}
              {statusFilter !== 'all' && <div className="ml-1 rounded-sm bg-primary w-1.5 h-1.5" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandList>
                <CommandGroup>
                  {(['all', 'enabled', 'disabled', 'error'] as FilterStatus[]).map((status) => (
                    <CommandItem
                      key={status}
                      onSelect={() => onStatusFilterChange(status)}
                      className="flex items-center justify-between"
                    >
                      <span>{getStatusLabel(status)}</span>
                      {statusFilter === status && <Check className="h-4 w-4" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Type Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-9 border-dashed transition-colors',
                typeFilter !== 'all' && 'bg-accent/50 border-solid',
                isBackgroundActive && TRANSPARENCY_CONFIG.interactive
              )}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              {typeFilter === 'all' ? 'Type' : typeFilter}
              {typeFilter !== 'all' && <div className="ml-1 rounded-sm bg-primary w-1.5 h-1.5" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandList>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onTypeFilterChange('all')}
                    className="justify-between"
                  >
                    All Types
                    {typeFilter === 'all' && <Check className="h-4 w-4" />}
                  </CommandItem>
                  <CommandSeparator />
                  <CommandItem
                    onSelect={() => onTypeFilterChange('frontend')}
                    className="justify-between"
                  >
                    Frontend
                    {typeFilter === 'frontend' && <Check className="h-4 w-4" />}
                  </CommandItem>
                  <CommandItem
                    onSelect={() => onTypeFilterChange('python')}
                    className="justify-between"
                  >
                    Python
                    {typeFilter === 'python' && <Check className="h-4 w-4" />}
                  </CommandItem>
                  <CommandItem
                    onSelect={() => onTypeFilterChange('hybrid')}
                    className="justify-between"
                  >
                    Hybrid
                    {typeFilter === 'hybrid' && <Check className="h-4 w-4" />}
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Capability Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-9 border-dashed transition-colors',
                capabilityFilter !== 'all' && 'bg-accent/50 border-solid',
                isBackgroundActive && TRANSPARENCY_CONFIG.interactive
              )}
            >
              <Check className="mr-2 h-4 w-4" />
              {capabilityFilter === 'all' ? 'Capability' : capabilityFilter}
              {capabilityFilter !== 'all' && <div className="ml-1 rounded-sm bg-primary w-1.5 h-1.5" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandList>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onCapabilityFilterChange('all')}
                    className="justify-between"
                  >
                    All Capabilities
                    {capabilityFilter === 'all' && <Check className="h-4 w-4" />}
                  </CommandItem>
                  <CommandSeparator />
                  <CommandItem
                    onSelect={() => onCapabilityFilterChange('chat')}
                    className="justify-between"
                  >
                    Chat
                    {capabilityFilter === 'chat' && <Check className="h-4 w-4" />}
                  </CommandItem>
                  <CommandItem
                    onSelect={() => onCapabilityFilterChange('code-execution')}
                    className="justify-between"
                  >
                    Code Execution
                    {capabilityFilter === 'code-execution' && <Check className="h-4 w-4" />}
                  </CommandItem>
                  <CommandItem
                    onSelect={() => onCapabilityFilterChange('file-access')}
                    className="justify-between"
                  >
                    File Access
                    {capabilityFilter === 'file-access' && <Check className="h-4 w-4" />}
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {(hasActiveFilters || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-9 px-2 lg:px-3 text-muted-foreground hover:text-foreground"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}

        {activeCount > 0 && !hasActiveFilters && !searchQuery && (
          <p className="text-xs text-muted-foreground ml-auto sm:ml-2 whitespace-nowrap hidden sm:block">
            Showing {activeCount} plugins
          </p>
        )}
      </div>
    </div>
  );
}
