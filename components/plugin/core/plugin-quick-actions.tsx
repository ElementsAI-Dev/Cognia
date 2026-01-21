'use client';

/**
 * Plugin Quick Actions - Batch operations and quick actions for plugins
 * Supports enabling/disabling multiple plugins, batch updates, and quick filters
 */

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Play,
  Pause,
  Trash2,
  Download,
  RefreshCw,
  CheckSquare,
  Square,
  AlertTriangle,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { Plugin } from '@/types/plugin';

// =============================================================================
// Types
// =============================================================================

interface PluginQuickActionsProps {
  plugins: Plugin[];
  selectedPlugins: Set<string>;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onEnableSelected: () => Promise<void>;
  onDisableSelected: () => Promise<void>;
  onUninstallSelected: () => Promise<void>;
  onUpdateSelected?: () => Promise<void>;
  className?: string;
}

// =============================================================================
// Main Component
// =============================================================================

export function PluginQuickActions({
  plugins,
  selectedPlugins,
  onSelectAll,
  onDeselectAll,
  onEnableSelected,
  onDisableSelected,
  onUninstallSelected,
  onUpdateSelected,
  className,
}: PluginQuickActionsProps) {
  const t = useTranslations('pluginQuickActions');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showUninstallDialog, setShowUninstallDialog] = useState(false);

  const selectedCount = selectedPlugins.size;
  const hasSelection = selectedCount > 0;
  const allSelected = selectedCount === plugins.length && plugins.length > 0;

  const selectedPluginsList = useMemo(() => {
    return plugins.filter(p => selectedPlugins.has(p.manifest.id));
  }, [plugins, selectedPlugins]);

  const enabledSelectedCount = selectedPluginsList.filter(p => p.status === 'enabled').length;
  const disabledSelectedCount = selectedPluginsList.filter(
    p => p.status === 'disabled' || p.status === 'loaded' || p.status === 'installed'
  ).length;

  const handleAction = async (action: string, handler: () => Promise<void>) => {
    setIsLoading(action);
    try {
      await handler();
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleUninstallConfirm = async () => {
    setShowUninstallDialog(false);
    await handleAction('uninstall', onUninstallSelected);
  };

  if (!hasSelection) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={onSelectAll}
          disabled={plugins.length === 0}
          className="h-8"
        >
          <CheckSquare className="h-4 w-4 mr-2" />
          {t('selectAll')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        'flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20',
        className
      )}>
        {/* Selection info */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="h-8 px-2"
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </Button>
          <Badge variant="secondary" className="text-xs">
            {t('selected', { count: selectedCount })}
          </Badge>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Quick actions */}
        <div className="flex items-center gap-1">
          {/* Enable */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAction('enable', onEnableSelected)}
            disabled={disabledSelectedCount === 0 || isLoading !== null}
            className="h-8"
          >
            {isLoading === 'enable' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span className="hidden sm:inline ml-1.5">{t('enable')}</span>
            {disabledSelectedCount > 0 && (
              <Badge variant="outline" className="ml-1.5 text-[10px] px-1 h-4">
                {disabledSelectedCount}
              </Badge>
            )}
          </Button>

          {/* Disable */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAction('disable', onDisableSelected)}
            disabled={enabledSelectedCount === 0 || isLoading !== null}
            className="h-8"
          >
            {isLoading === 'disable' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
            <span className="hidden sm:inline ml-1.5">{t('disable')}</span>
            {enabledSelectedCount > 0 && (
              <Badge variant="outline" className="ml-1.5 text-[10px] px-1 h-4">
                {enabledSelectedCount}
              </Badge>
            )}
          </Button>

          {/* Update - if handler provided */}
          {onUpdateSelected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction('update', onUpdateSelected)}
              disabled={isLoading !== null}
              className="h-8 hidden md:flex"
            >
              {isLoading === 'update' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="ml-1.5">{t('update')}</span>
            </Button>
          )}

          {/* Uninstall */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUninstallDialog(true)}
            disabled={isLoading !== null}
            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {isLoading === 'uninstall' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline ml-1.5">{t('uninstall')}</span>
          </Button>
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 hidden sm:flex">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('moreActions')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('enable', onEnableSelected)}>
              <Play className="h-4 w-4 mr-2" />
              {t('enableAll')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('disable', onDisableSelected)}>
              <Pause className="h-4 w-4 mr-2" />
              {t('disableAll')}
            </DropdownMenuItem>
            {onUpdateSelected && (
              <DropdownMenuItem onClick={() => handleAction('update', onUpdateSelected)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('checkUpdates')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowUninstallDialog(true)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('uninstallAll')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Deselect button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeselectAll}
          className="h-8 ml-auto"
        >
          {t('deselect')}
        </Button>
      </div>

      {/* Uninstall Confirmation Dialog */}
      <AlertDialog open={showUninstallDialog} onOpenChange={setShowUninstallDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('uninstallDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('uninstallDialog.description', { count: selectedCount })}
              <div className="mt-3 p-3 bg-muted rounded-lg max-h-32 overflow-auto">
                <ul className="text-sm space-y-1">
                  {selectedPluginsList.slice(0, 5).map(p => (
                    <li key={p.manifest.id} className="flex items-center gap-2">
                      <span className="font-medium">{p.manifest.name}</span>
                      <span className="text-muted-foreground">v{p.manifest.version}</span>
                    </li>
                  ))}
                  {selectedPluginsList.length > 5 && (
                    <li className="text-muted-foreground">
                      {t('uninstallDialog.andMore', { count: selectedPluginsList.length - 5 })}
                    </li>
                  )}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('uninstallDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUninstallConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('uninstallDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default PluginQuickActions;
