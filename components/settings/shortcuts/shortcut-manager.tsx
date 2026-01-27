'use client';

/**
 * Shortcut Manager
 * 
 * Unified panel for managing all keyboard shortcuts across the application
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Search, AlertTriangle, Settings2, Download, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { useNativeStore } from '@/stores/system';
import { getAllShortcutMetadata } from '@/lib/native/shortcuts';
import { ShortcutConflictDialog } from './shortcut-conflict-dialog';
import type { ShortcutMetadata, ShortcutConflict, ConflictResolution } from '@/types/shortcut';
import { cn } from '@/lib/utils';

export function ShortcutManager() {
  const t = useTranslations('shortcutManager');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  const {
    shortcutConflicts,
    conflictResolutionMode,
    detectConflicts,
    resolveConflict,
    setConflictResolutionMode,
  } = useNativeStore();

  const [allShortcuts, setAllShortcuts] = useState<ShortcutMetadata[]>(() => getAllShortcutMetadata());

  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, ShortcutMetadata[]> = {};
    
    for (const shortcut of allShortcuts) {
      if (!groups[shortcut.owner]) {
        groups[shortcut.owner] = [];
      }
      groups[shortcut.owner].push(shortcut);
    }
    
    return groups;
  }, [allShortcuts]);

  const filteredShortcuts = useMemo(() => {
    let filtered = allShortcuts;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.shortcut.toLowerCase().includes(query) ||
          s.action.toLowerCase().includes(query) ||
          s.owner.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((s) => s.owner === selectedCategory);
    }

    return filtered;
  }, [allShortcuts, searchQuery, selectedCategory]);

  const handleRefresh = () => {
    const shortcuts = getAllShortcutMetadata();
    setAllShortcuts(shortcuts);
    detectConflicts();
  };

  const handleDetectConflicts = async () => {
    await detectConflicts();
    if (shortcutConflicts.length > 0) {
      setShowConflictDialog(true);
    }
  };

  const handleResolveConflict = (conflict: ShortcutConflict, resolution: ConflictResolution) => {
    resolveConflict(conflict, resolution);
    handleRefresh();
  };

  const handleExport = () => {
    const data = JSON.stringify(allShortcuts, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shortcuts-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categories = useMemo(() => {
    return ['all', ...Object.keys(groupedShortcuts)];
  }, [groupedShortcuts]);

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                {t('title')}
              </CardTitle>
              <CardDescription>
                {t('description')}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {shortcutConflicts.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowConflictDialog(true)}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {t('conflictsCount', { count: shortcutConflicts.length })}
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('refresh')}
              </Button>

              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                {t('export')}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {shortcutConflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('conflictsCount', { count: shortcutConflicts.length })}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDetectConflicts}
            >
              {t('detectConflicts')}
            </Button>
          </div>

          <Separator />

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="w-full justify-start overflow-x-auto">
              {categories.map((category) => (
                <TabsTrigger key={category} value={category} className="capitalize">
                  {category === 'all' ? t('categories.all') : category}
                  {category !== 'all' && (
                    <Badge variant="secondary" className="ml-2">
                      {groupedShortcuts[category]?.length || 0}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="space-y-4">
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('tableShortcut')}</TableHead>
                      <TableHead>{t('tableAction')}</TableHead>
                      <TableHead>{t('tableOwner')}</TableHead>
                      <TableHead>{t('tableStatus')}</TableHead>
                      <TableHead className="text-right">{t('tableRegistered')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShortcuts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          {t('noShortcuts')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredShortcuts.map((shortcut) => {
                        const hasConflict = shortcutConflicts.some(
                          (c) => c.shortcut === shortcut.shortcut
                        );

                        return (
                          <TableRow key={`${shortcut.owner}-${shortcut.shortcut}`}>
                            <TableCell className="font-mono">
                              <Badge variant="outline">{shortcut.shortcut}</Badge>
                            </TableCell>
                            <TableCell>{shortcut.action}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{shortcut.owner}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    'h-2 w-2 rounded-full',
                                    shortcut.enabled ? 'bg-green-500' : 'bg-gray-300'
                                  )}
                                />
                                {shortcut.enabled ? t('enabled') : t('disabled')}
                                {hasConflict && (
                                  <AlertTriangle className="h-4 w-4 text-destructive ml-2" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {new Date(shortcut.registeredAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  {t('showingCount', { filtered: filteredShortcuts.length, total: allShortcuts.length })}
                </div>
                <div className="flex items-center gap-4">
                  <Label className="text-muted-foreground">{t('resolutionModeLabel')}</Label>
                  <Select
                    value={conflictResolutionMode}
                    onValueChange={(value) => setConflictResolutionMode(value as 'warn' | 'block' | 'auto-resolve')}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SelectItem value="warn">{t('resolutionWarn')}</SelectItem>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p>{t('resolutionWarnTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SelectItem value="block">{t('resolutionBlock')}</SelectItem>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p>{t('resolutionBlockTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SelectItem value="auto-resolve">{t('resolutionAutoResolve')}</SelectItem>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p>{t('resolutionAutoResolveTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>

        <ShortcutConflictDialog
          open={showConflictDialog}
          onOpenChange={setShowConflictDialog}
          conflicts={shortcutConflicts}
          onResolve={handleResolveConflict}
          onResolveAll={(resolution) => {
            shortcutConflicts.forEach((conflict) => {
              resolveConflict(conflict, resolution);
            });
            handleRefresh();
          }}
        />
      </Card>
    </TooltipProvider>
  );
}

export default ShortcutManager;
