'use client';

/**
 * KeyboardShortcutsPanel - Display and manage keyboard shortcuts
 */

import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Keyboard,
  Search,
  Command,
  Save,
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Square,
  LayoutGrid,
  Eye,
  Plus,
} from 'lucide-react';

interface ShortcutItem {
  id: string;
  keys: string[];
  description: string;
  category: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const SHORTCUTS: ShortcutItem[] = [
  // File operations
  { id: 'save', keys: ['Ctrl', 'S'], description: 'Save workflow', category: 'File', icon: Save },
  { id: 'new', keys: ['Ctrl', 'N'], description: 'New workflow', category: 'File', icon: Plus },
  
  // Edit operations
  { id: 'undo', keys: ['Ctrl', 'Z'], description: 'Undo', category: 'Edit', icon: Undo2 },
  { id: 'redo', keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo', category: 'Edit', icon: Redo2 },
  { id: 'copy', keys: ['Ctrl', 'C'], description: 'Copy selection', category: 'Edit', icon: Copy },
  { id: 'cut', keys: ['Ctrl', 'X'], description: 'Cut selection', category: 'Edit', icon: Scissors },
  { id: 'paste', keys: ['Ctrl', 'V'], description: 'Paste', category: 'Edit', icon: Clipboard },
  { id: 'delete', keys: ['Delete'], description: 'Delete selection', category: 'Edit', icon: Trash2 },
  { id: 'selectAll', keys: ['Ctrl', 'A'], description: 'Select all', category: 'Edit' },
  { id: 'duplicate', keys: ['Ctrl', 'D'], description: 'Duplicate selection', category: 'Edit', icon: Copy },
  
  // View operations
  { id: 'zoomIn', keys: ['Ctrl', '+'], description: 'Zoom in', category: 'View', icon: ZoomIn },
  { id: 'zoomOut', keys: ['Ctrl', '-'], description: 'Zoom out', category: 'View', icon: ZoomOut },
  { id: 'fitView', keys: ['Ctrl', '0'], description: 'Fit view', category: 'View', icon: Maximize2 },
  { id: 'toggleMinimap', keys: ['Ctrl', 'M'], description: 'Toggle minimap', category: 'View', icon: Eye },
  { id: 'togglePalette', keys: ['Ctrl', 'B'], description: 'Toggle node palette', category: 'View' },
  { id: 'toggleConfig', keys: ['Ctrl', 'I'], description: 'Toggle config panel', category: 'View' },
  
  // Execution
  { id: 'run', keys: ['F5'], description: 'Run workflow', category: 'Execution', icon: Play },
  { id: 'stop', keys: ['Shift', 'F5'], description: 'Stop execution', category: 'Execution', icon: Square },
  { id: 'pause', keys: ['Ctrl', 'F5'], description: 'Pause execution', category: 'Execution' },
  { id: 'stepOver', keys: ['F10'], description: 'Step over (debug)', category: 'Execution' },
  { id: 'stepInto', keys: ['F11'], description: 'Step into (debug)', category: 'Execution' },
  { id: 'continue', keys: ['F8'], description: 'Continue (debug)', category: 'Execution' },
  { id: 'toggleBreakpoint', keys: ['F9'], description: 'Toggle breakpoint', category: 'Execution' },
  { id: 'toggleDebug', keys: ['Ctrl', 'Shift', 'D'], description: 'Toggle debug mode', category: 'Execution' },
  
  // Layout
  { id: 'autoLayout', keys: ['Ctrl', 'L'], description: 'Auto layout', category: 'Layout', icon: LayoutGrid },
  { id: 'alignLeft', keys: ['Ctrl', 'Shift', 'L'], description: 'Align left', category: 'Layout' },
  { id: 'alignCenter', keys: ['Ctrl', 'Shift', 'C'], description: 'Align center', category: 'Layout' },
  { id: 'alignRight', keys: ['Ctrl', 'Shift', 'R'], description: 'Align right', category: 'Layout' },
  
  // Navigation
  { id: 'search', keys: ['Ctrl', 'F'], description: 'Search nodes', category: 'Navigation', icon: Search },
  { id: 'commandPalette', keys: ['Ctrl', 'K'], description: 'Command palette', category: 'Navigation', icon: Command },
  { id: 'escape', keys: ['Escape'], description: 'Clear selection / Cancel', category: 'Navigation' },
];

const CATEGORIES = ['File', 'Edit', 'View', 'Execution', 'Layout', 'Navigation'];

interface KeyboardShortcutsPanelProps {
  className?: string;
}

export function KeyboardShortcutsPanel({ className }: KeyboardShortcutsPanelProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter shortcuts
  const filteredShortcuts = searchQuery
    ? SHORTCUTS.filter(
        s =>
          s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.keys.join(' ').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : SHORTCUTS;

  // Group by category
  const groupedShortcuts = CATEGORIES.reduce((acc, category) => {
    const items = filteredShortcuts.filter(s => s.category === category);
    if (items.length > 0) {
      acc[category] = items;
    }
    return acc;
  }, {} as Record<string, ShortcutItem[]>);

  // Global shortcut to open panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderKey = (key: string) => (
    <kbd
      key={key}
      className={cn(
        'px-1.5 py-0.5 text-xs font-mono rounded border bg-muted',
        'min-w-[24px] text-center inline-block'
      )}
    >
      {key === 'Ctrl' && navigator.platform.includes('Mac') ? '⌘' : key}
    </kbd>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className={className}>
                <Keyboard className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Keyboard Shortcuts (Shift + ?)
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick reference for all available keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Shortcuts list */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                    {category}
                  </h4>
                  <div className="space-y-1">
                    {shortcuts.map((shortcut) => {
                      const Icon = shortcut.icon;
                      return (
                        <div
                          key={shortcut.id}
                          className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent"
                        >
                          <div className="flex items-center gap-2">
                            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                            <span className="text-sm">{shortcut.description}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, index) => (
                              <span key={key} className="flex items-center gap-1">
                                {renderKey(key)}
                                {index < shortcut.keys.length - 1 && (
                                  <span className="text-muted-foreground text-xs">+</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {Object.keys(groupedShortcuts).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No shortcuts found</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer tip */}
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
            <span>Press {renderKey('Shift')} + {renderKey('?')} anytime to show this dialog</span>
            <Badge variant="outline">
              {SHORTCUTS.length} shortcuts
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsPanel;
