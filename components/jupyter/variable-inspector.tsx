'use client';

/**
 * VariableInspector - Displays kernel namespace variables
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight, RefreshCw, Search, Loader2, Variable } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Empty, EmptyMedia, EmptyDescription } from '@/components/ui/empty';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import type { VariableInfo } from '@/types/system/jupyter';

interface VariableInspectorProps {
  variables: VariableInfo[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onInspect?: (variableName: string) => void;
  className?: string;
}

const typeColors: Record<string, string> = {
  int: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  float: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  str: 'bg-green-500/10 text-green-700 dark:text-green-400',
  bool: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  list: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  dict: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  tuple: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
  set: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  ndarray: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  DataFrame: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  Series: 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
  Tensor: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

export function VariableInspector({
  variables,
  isLoading,
  onRefresh,
  onInspect,
  className,
}: VariableInspectorProps) {
  const t = useTranslations('jupyter');
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(true);

  const filteredVariables = variables.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    return typeColors[type] || 'bg-muted text-muted-foreground';
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
        </CollapsibleTrigger>

        <Variable className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t('variables')}</span>
        <Badge variant="secondary" className="text-xs">
          {variables.length}
        </Badge>

        <div className="flex-1" />

        {onRefresh && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('refreshVariables')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <CollapsibleContent>
        {variables.length > 5 && (
          <div className="px-3 py-2 border-b">
            <InputGroup className="h-7">
              <InputGroupAddon align="inline-start">
                <Search className="h-3 w-3" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t('searchVariables')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs"
              />
            </InputGroup>
          </div>
        )}

        <ScrollArea className="max-h-[300px]">
          {isLoading && variables.length === 0 ? (
            <div className="px-3 py-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          ) : filteredVariables.length === 0 ? (
            <Empty className="py-6 border-0">
              <EmptyMedia variant="icon">
                <Variable className="h-4 w-4" />
              </EmptyMedia>
              <EmptyDescription>
                {variables.length === 0 ? t('noVariables') : t('noMatchingVariables')}
              </EmptyDescription>
            </Empty>
          ) : (
            <TooltipProvider>
              <div className="divide-y">
                {filteredVariables.map((variable) => (
                  <Tooltip key={variable.name}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'px-3 py-2 hover:bg-muted/50 transition-colors',
                          onInspect && 'cursor-pointer'
                        )}
                        onClick={() => onInspect?.(variable.name)}
                      >
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono font-medium">{variable.name}</code>
                          <Badge
                            variant="secondary"
                            className={cn('text-[10px] px-1.5 py-0', getTypeColor(variable.type))}
                          >
                            {variable.type}
                          </Badge>
                          {variable.size && (
                            <span className="text-[10px] text-muted-foreground">
                              {variable.size}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground font-mono truncate">
                          {variable.value}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[300px]">
                      <div className="space-y-1">
                        <div className="font-medium">{variable.name}</div>
                        <div className="text-xs font-mono break-all">{variable.value}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          )}
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default VariableInspector;
