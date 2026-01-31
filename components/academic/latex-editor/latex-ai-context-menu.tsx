'use client';

import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useLatexAI, type LatexAITextAction } from '@/hooks/latex/use-latex-ai';

interface LatexAIContextMenuProps {
  selectedText: string;
  onReplaceSelection: (text: string) => void;
  children: ReactNode;
}

export function LatexAIContextMenu({
  selectedText,
  onReplaceSelection,
  children,
}: LatexAIContextMenuProps) {
  const t = useTranslations('latex');
  const { runTextAction, isLoading } = useLatexAI();

  const run = useCallback(
    async (action: LatexAITextAction) => {
      const text = selectedText.trim();
      if (!text) return;

      const result = await runTextAction({
        action,
        text,
        targetLanguage: action === 'translate' ? 'Chinese (Simplified)' : undefined,
      });

      if (result) {
        onReplaceSelection(result);
      }
    },
    [onReplaceSelection, runTextAction, selectedText]
  );

  const hasSelection = selectedText.trim().length > 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel>{t('ai.actions')}</ContextMenuLabel>
        <ContextMenuSeparator />

        <ContextMenuItem disabled={!hasSelection || isLoading} onSelect={() => void run('improveWriting')}>
          {t('ai.menu.improveWriting')}
        </ContextMenuItem>
        <ContextMenuItem disabled={!hasSelection || isLoading} onSelect={() => void run('fixGrammar')}>
          {t('ai.menu.fixGrammar')}
        </ContextMenuItem>
        <ContextMenuItem disabled={!hasSelection || isLoading} onSelect={() => void run('makeConcise')}>
          {t('ai.menu.makeConcise')}
        </ContextMenuItem>
        <ContextMenuItem disabled={!hasSelection || isLoading} onSelect={() => void run('expandText')}>
          {t('ai.menu.expandText')}
        </ContextMenuItem>
        <ContextMenuItem disabled={!hasSelection || isLoading} onSelect={() => void run('translate')}>
          {t('ai.menu.translate')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default LatexAIContextMenu;
