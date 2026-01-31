'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PenLine, Sigma, SpellCheck, Languages, Settings, ChevronRight, Sparkles } from 'lucide-react';

export type LatexAIFeature =
  | 'writingAssistant'
  | 'equationGenerator'
  | 'grammarCheck'
  | 'translation'
  | 'settings'
  | 'improveWriting'
  | 'fixGrammar'
  | 'makeConcise'
  | 'expandText'
  | 'translate';

interface LatexAIDropdownProps {
  onSelect: (feature: LatexAIFeature) => void;
  className?: string;
}

export function LatexAIDropdown({ onSelect, className }: LatexAIDropdownProps) {
  const t = useTranslations('latex');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          className={cn(
            'gap-1.5',
            'bg-linear-to-br from-violet-600 to-blue-500 text-white',
            'hover:from-violet-600/90 hover:to-blue-500/90',
            className
          )}
        >
          <Sparkles className="h-4 w-4" />
          {t('ai.button')}
          <ChevronRight className="h-4 w-4 rotate-90 opacity-90" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64 p-0 overflow-hidden" align="end">
        <div className="px-4 py-3 bg-linear-to-br from-violet-600 to-blue-500 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <div className="font-semibold text-sm">{t('ai.features')}</div>
          </div>
        </div>

        <div className="p-2">
          <DropdownMenuItem
            className="gap-3 rounded-md py-2.5"
            onClick={() => onSelect('writingAssistant')}
          >
            <div className="h-8 w-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
              <PenLine className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('ai.writingAssistant.title')}</div>
              <div className="text-xs text-muted-foreground">{t('ai.writingAssistant.description')}</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-3 rounded-md py-2.5"
            onClick={() => onSelect('equationGenerator')}
          >
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Sigma className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('ai.equationGenerator.title')}</div>
              <div className="text-xs text-muted-foreground">{t('ai.equationGenerator.description')}</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-3 rounded-md py-2.5"
            onClick={() => onSelect('grammarCheck')}
          >
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <SpellCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('ai.grammarCheck.title')}</div>
              <div className="text-xs text-muted-foreground">{t('ai.grammarCheck.description')}</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-3 rounded-md py-2.5"
            onClick={() => onSelect('translation')}
          >
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Languages className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('ai.translation.title')}</div>
              <div className="text-xs text-muted-foreground">{t('ai.translation.description')}</div>
            </div>
          </DropdownMenuItem>

          <Separator className="my-2" />

          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {t('ai.actions')}
          </div>

          <DropdownMenuItem
            className="gap-3 rounded-md py-2.5"
            onClick={() => onSelect('improveWriting')}
          >
            <PenLine className="h-4 w-4" />
            <span className="text-sm">{t('ai.menu.improveWriting')}</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-3 rounded-md py-2.5"
            onClick={() => onSelect('fixGrammar')}
          >
            <SpellCheck className="h-4 w-4" />
            <span className="text-sm">{t('ai.menu.fixGrammar')}</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-3 rounded-md py-2.5"
            onClick={() => onSelect('makeConcise')}
          >
            <span className="text-sm">{t('ai.menu.makeConcise')}</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-3 rounded-md py-2.5"
            onClick={() => onSelect('expandText')}
          >
            <span className="text-sm">{t('ai.menu.expandText')}</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-3 rounded-md py-2.5"
            onClick={() => onSelect('translate')}
          >
            <Languages className="h-4 w-4" />
            <span className="text-sm">{t('ai.menu.translate')}</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-3 rounded-md py-2.5 text-muted-foreground"
            onClick={() => onSelect('settings')}
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm">{t('ai.menu.settings')}</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LatexAIDropdown;
