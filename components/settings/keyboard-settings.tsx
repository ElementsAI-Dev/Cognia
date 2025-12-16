'use client';

/**
 * KeyboardSettings - Configure and view keyboard shortcuts
 */

import { Keyboard } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useKeyboardShortcuts,
  formatShortcut,
  type KeyboardShortcut,
} from '@/hooks/use-keyboard-shortcuts';

const CATEGORY_LABELS: Record<KeyboardShortcut['category'], string> = {
  navigation: 'Navigation',
  chat: 'Chat',
  editing: 'Editing',
  system: 'System',
};

const CATEGORY_COLORS: Record<KeyboardShortcut['category'], string> = {
  navigation: 'bg-blue-500',
  chat: 'bg-green-500',
  editing: 'bg-purple-500',
  system: 'bg-orange-500',
};

export function KeyboardSettings() {
  const { shortcuts } = useKeyboardShortcuts({ enabled: false });

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<KeyboardShortcut['category'], KeyboardShortcut[]>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </CardTitle>
          <CardDescription>
            Use keyboard shortcuts to navigate and interact faster
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={`${CATEGORY_COLORS[category as KeyboardShortcut['category']]} text-white`}
                >
                  {CATEGORY_LABELS[category as KeyboardShortcut['category']]}
                </Badge>
              </div>
              <div className="grid gap-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-background border rounded shadow-sm">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Press <kbd className="px-1 py-0.5 text-xs font-mono bg-muted border rounded">/</kbd> anywhere to focus the chat input</p>
          <p>• Use <kbd className="px-1 py-0.5 text-xs font-mono bg-muted border rounded">Ctrl+K</kbd> to open the command palette for quick actions</p>
          <p>• Press <kbd className="px-1 py-0.5 text-xs font-mono bg-muted border rounded">Esc</kbd> to stop AI generation</p>
          <p>• Hold <kbd className="px-1 py-0.5 text-xs font-mono bg-muted border rounded">Shift+Enter</kbd> for multi-line input</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default KeyboardSettings;
