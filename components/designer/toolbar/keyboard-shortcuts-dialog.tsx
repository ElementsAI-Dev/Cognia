'use client';

/**
 * KeyboardShortcutsDialog - Modal showing all available keyboard shortcuts
 * v0-style help dialog for power users
 */

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Keyboard, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShortcutItem {
  keys: string[];
  description: string;
  category: string;
}

const KEYBOARD_SHORTCUTS: ShortcutItem[] = [
  // General
  { keys: ['Ctrl', 'Z'], description: 'Undo last action', category: 'General' },
  { keys: ['Ctrl', 'Y'], description: 'Redo action', category: 'General' },
  { keys: ['Ctrl', 'S'], description: 'Save changes', category: 'General' },
  { keys: ['Ctrl', 'Shift', 'S'], description: 'Save as new template', category: 'General' },
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'General' },
  
  // Navigation
  { keys: ['Ctrl', 'E'], description: 'Toggle code/preview mode', category: 'Navigation' },
  { keys: ['Ctrl', 'B'], description: 'Toggle sidebar', category: 'Navigation' },
  { keys: ['Ctrl', '1'], description: 'Switch to preview mode', category: 'Navigation' },
  { keys: ['Ctrl', '2'], description: 'Switch to design mode', category: 'Navigation' },
  { keys: ['Ctrl', '3'], description: 'Switch to code mode', category: 'Navigation' },
  
  // Elements
  { keys: ['Delete'], description: 'Delete selected element', category: 'Elements' },
  { keys: ['Ctrl', 'D'], description: 'Duplicate selected element', category: 'Elements' },
  { keys: ['Ctrl', 'C'], description: 'Copy element', category: 'Elements' },
  { keys: ['Ctrl', 'V'], description: 'Paste element', category: 'Elements' },
  { keys: ['Escape'], description: 'Deselect element', category: 'Elements' },
  { keys: ['↑', '↓'], description: 'Navigate element tree', category: 'Elements' },
  
  // Viewport
  { keys: ['Ctrl', '+'], description: 'Zoom in', category: 'Viewport' },
  { keys: ['Ctrl', '-'], description: 'Zoom out', category: 'Viewport' },
  { keys: ['Ctrl', '0'], description: 'Reset zoom to 100%', category: 'Viewport' },
  { keys: ['M'], description: 'Mobile viewport', category: 'Viewport' },
  { keys: ['T'], description: 'Tablet viewport', category: 'Viewport' },
  { keys: ['D'], description: 'Desktop viewport', category: 'Viewport' },
  
  // AI
  { keys: ['Ctrl', 'K'], description: 'Open AI prompt bar', category: 'AI' },
  { keys: ['Ctrl', 'Enter'], description: 'Submit AI prompt', category: 'AI' },
  { keys: ['Escape'], description: 'Close AI panel', category: 'AI' },
];

// Group shortcuts by category
const groupedShortcuts = KEYBOARD_SHORTCUTS.reduce(
  (acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  },
  {} as Record<string, ShortcutItem[]>
);

interface KeyboardShortcutsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

// Keyboard key component
function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center min-w-[24px] h-6 px-1.5',
        'text-xs font-medium',
        'bg-muted border border-border rounded shadow-sm'
      )}
    >
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  trigger,
}: KeyboardShortcutsDialogProps) {
  const t = useTranslations('designer');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            {t('keyboardShortcuts', { fallback: 'Keyboard Shortcuts' })}
          </DialogTitle>
          <DialogDescription>
            {t('shortcutsDescription', {
              fallback: 'Use these keyboard shortcuts to work faster in the designer.',
            })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {category}
                  </Badge>
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
                    >
                      <span className="text-sm text-muted-foreground">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <span key={keyIdx} className="flex items-center">
                            <Key>
                              {key === 'Ctrl' ? (
                                <span className="flex items-center">
                                  <Command className="h-3 w-3" />
                                </span>
                              ) : (
                                key
                              )}
                            </Key>
                            {keyIdx < shortcut.keys.length - 1 && (
                              <span className="mx-0.5 text-muted-foreground">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {category !== Object.keys(groupedShortcuts).pop() && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t pt-4 -mx-6 px-6">
          <p className="text-xs text-muted-foreground text-center">
            Press <Key>?</Key> at any time to show this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsDialog;
