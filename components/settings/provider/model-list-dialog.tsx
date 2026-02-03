'use client';

/**
 * ModelListDialog - Dialog for selecting and managing available models
 * Matches the design spec with search, filters, and multi-select capability
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  X,
  Eye,
  Wrench,
  Brain,
  Sparkles,
  Settings2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Model } from '@/types/provider';

type FilterType = 'all' | 'vision' | 'tools' | 'reasoning';

interface ModelListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: Model[];
  selectedModels: string[];
  onModelsChange: (models: string[]) => void;
  providerName?: string;
  onModelSettings?: (model: Model) => void;
}

export function ModelListDialog({
  open,
  onOpenChange,
  models,
  selectedModels,
  onModelsChange,
  providerName: _providerName = 'Provider',
  onModelSettings,
}: ModelListDialogProps) {
  const t = useTranslations('providers');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [localSelected, setLocalSelected] = useState<string[]>(selectedModels);

  // Reset local state when dialog opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setLocalSelected(selectedModels);
        setSearchQuery('');
        setActiveFilter('all');
      }
      onOpenChange(isOpen);
    },
    [selectedModels, onOpenChange]
  );

  // Filter models based on search and capabilities
  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (
          !model.name.toLowerCase().includes(query) &&
          !model.id.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Capability filter
      switch (activeFilter) {
        case 'vision':
          return model.supportsVision;
        case 'tools':
          return model.supportsTools;
        case 'reasoning':
          return model.supportsReasoning;
        default:
          return true;
      }
    });
  }, [models, searchQuery, activeFilter]);

  // Count models by capability
  const capabilityCounts = useMemo(() => {
    return {
      all: models.length,
      vision: models.filter((m) => m.supportsVision).length,
      tools: models.filter((m) => m.supportsTools).length,
      reasoning: models.filter((m) => m.supportsReasoning).length,
    };
  }, [models]);

  const toggleModel = (modelId: string) => {
    setLocalSelected((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  };

  const toggleSelectAll = () => {
    if (localSelected.length === filteredModels.length) {
      setLocalSelected([]);
    } else {
      setLocalSelected(filteredModels.map((m) => m.id));
    }
  };

  const handleConfirm = () => {
    onModelsChange(localSelected);
    onOpenChange(false);
  };

  const filterButtons: { key: FilterType; icon: React.ReactNode; label: string }[] = [
    { key: 'all', icon: <Sparkles className="h-3 w-3" />, label: t('filterAll') || 'All' },
    { key: 'vision', icon: <Eye className="h-3 w-3" />, label: t('filterVision') || 'Vision' },
    { key: 'tools', icon: <Wrench className="h-3 w-3" />, label: t('filterTools') || 'Tools' },
    { key: 'reasoning', icon: <Brain className="h-3 w-3" />, label: t('filterReasoning') || 'Reasoning' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {t('availableModels') || 'Available Models'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Search */}
        <div className="px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('searchModels') || 'Search models...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={
                filteredModels.length > 0 &&
                localSelected.length === filteredModels.length
              }
              onCheckedChange={toggleSelectAll}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer"
            >
              {t('selectAll') || 'Select All'}
            </label>
          </div>
          <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterType)}>
            <TabsList className="h-8 bg-secondary/50">
              {filterButtons.map((filter) => (
                <TabsTrigger
                  key={filter.key}
                  value={filter.key}
                  className="text-xs gap-1 px-2.5 data-[state=active]:bg-background"
                >
                  {filter.icon}
                  {filter.label}
                  <span className="ml-0.5 opacity-70">
                    {capabilityCounts[filter.key]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Model List */}
        <ScrollArea className="flex-1 min-h-0 px-5">
          <div className="space-y-2 pb-4">
            {filteredModels.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {t('noModelsFound') || 'No models found'}
              </div>
            ) : (
              filteredModels.map((model) => (
                <ModelListItem
                  key={model.id}
                  model={model}
                  selected={localSelected.includes(model.id)}
                  onToggle={() => toggleModel(model.id)}
                  onSettings={onModelSettings ? () => onModelSettings(model) : undefined}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="flex-row items-center justify-between px-5 py-4 border-t bg-muted/30">
          <span className="text-sm text-muted-foreground">
            {t('modelsSelected', { count: localSelected.length }) ||
              `${localSelected.length} models selected`}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleConfirm}>
              {t('addSelected') || 'Add Selected'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ModelListItemProps {
  model: Model;
  selected: boolean;
  onToggle: () => void;
  onSettings?: () => void;
}

function ModelListItem({ model, selected, onToggle, onSettings }: ModelListItemProps) {
  const formatContextLength = (length: number) => {
    if (length >= 1000000) {
      return `${(length / 1000000).toFixed(1)}M`;
    }
    return `${Math.round(length / 1000)}K`;
  };

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return `$${price.toFixed(2)}`;
  };

  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors text-left',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-background hover:bg-muted/50'
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Checkbox checked={selected} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{model.name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{formatContextLength(model.contextLength)} context</span>
            {model.pricing?.promptPer1M && (
              <>
                <span>•</span>
                <span>{formatPrice(model.pricing.promptPer1M)}/1M input</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {model.supportsVision && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1">
            <Eye className="h-2.5 w-2.5" />
            Vision
          </Badge>
        )}
        {model.supportsTools && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1">
            <Wrench className="h-2.5 w-2.5" />
            Tools
          </Badge>
        )}
        {model.supportsReasoning && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1">
            <Brain className="h-2.5 w-2.5" />
            Reasoning
          </Badge>
        )}
        {onSettings && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSettings();
            }}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Model Settings"
          >
            <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </button>
  );
}

export default ModelListDialog;
