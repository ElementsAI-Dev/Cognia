'use client';

import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { RULE_TARGETS } from '../constants';

interface RulesEditorFooterProps {
  activeTab: string;
  charCount: number;
  wordCount: number;
  tokenEstimate: number;
  isDirty: boolean;
}

export function RulesEditorFooter({
  activeTab,
  charCount,
  wordCount,
  tokenEstimate,
  isDirty,
}: RulesEditorFooterProps) {
  const t = useTranslations('rules');
  const activePath = RULE_TARGETS.find((target) => target.id === activeTab)?.path;

  return (
    <div className="py-2 px-3 md:px-4 border-t bg-muted/10 shrink-0 h-9 md:h-10 flex items-center justify-between text-[10px] md:text-[11px] text-muted-foreground font-mono">
      <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
        <span className="flex items-center gap-1 truncate">
          <Info className="h-3 w-3 shrink-0" />
          <span className="truncate">{activePath}</span>
        </span>
        <Separator orientation="vertical" className="h-3 hidden sm:block" />
        <span className="hidden sm:flex items-center gap-1">
          <strong>{charCount}</strong> {t('chars')}
        </span>
        <span className="hidden sm:flex items-center gap-1 text-muted-foreground/60">
          <strong>{wordCount}</strong> {t('words')}
        </span>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <span className="hidden sm:flex items-center gap-1">
          {t('tokens')}: <span className="text-primary font-bold">{tokenEstimate}</span>
        </span>
        <Separator orientation="vertical" className="h-3 hidden sm:block" />
        <div className="flex items-center gap-1">
          <div className={cn('h-2 w-2 rounded-full', isDirty ? 'bg-yellow-500' : 'bg-green-500')} />
          <span className="hidden xs:inline">{isDirty ? t('unsavedChanges') : t('synced')}</span>
        </div>
      </div>
    </div>
  );
}
