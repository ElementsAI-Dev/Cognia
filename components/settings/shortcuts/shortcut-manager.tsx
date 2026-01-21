'use client';

/**
 * Shortcut Manager
 * 
 * Unified panel for managing all keyboard shortcuts across the application
 */

import { useState, useMemo } from 'react';
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
import { useNativeStore } from '@/stores/system';
import { getAllShortcutMetadata } from '@/lib/native/shortcuts';
import { ShortcutConflictDialog } from './shortcut-conflict-dialog';
import type { ShortcutMetadata, ShortcutConflict, ConflictResolution } from '@/types/shortcut';
import { cn } from '@/lib/utils';

export function ShortcutManager() {
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Shortcut Manager
            </CardTitle>
            <CardDescription>
              View and manage all keyboard shortcuts
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
                {shortcutConflicts.length} Conflict{shortcutConflicts.length > 1 ? 's' : ''}
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
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
            Detect Conflicts
          </Button>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="capitalize">
                {category}
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
                    <TableHead>Shortcut</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShortcuts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No shortcuts found
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
                              {shortcut.enabled ? 'Enabled' : 'Disabled'}
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
                Showing {filteredShortcuts.length} of {allShortcuts.length} shortcuts
              </div>
              <div className="flex items-center gap-4">
                <span>Conflict Resolution Mode:</span>
                <Select
                  value={conflictResolutionMode}
                  onValueChange={(value) => setConflictResolutionMode(value as 'warn' | 'block' | 'auto-resolve')}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warn">Warn</SelectItem>
                    <SelectItem value="block">Block</SelectItem>
                    <SelectItem value="auto-resolve">Auto-Resolve</SelectItem>
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
  );
}

export default ShortcutManager;
