'use client';

import { memo, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { SuggestionCategory } from '@/components/ai-elements/suggestion';
import {
  MessageSquare,
  Code,
  FileText,
  Languages,
  Sparkles,
  Brain,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';

interface QuickSuggestion {
  icon: React.ReactNode;
  label: string;
  description: string;
  prompt: string;
  visibility: 'common' | 'advanced';
  category: SuggestionCategory;
}

const categoryStyles: Record<SuggestionCategory, { color: string; bg: string }> = {
  general: { color: 'text-purple-500', bg: 'bg-purple-500/10' },
  'follow-up': { color: 'text-blue-500', bg: 'bg-blue-500/10' },
  explore: { color: 'text-green-500', bg: 'bg-green-500/10' },
  code: { color: 'text-orange-500', bg: 'bg-orange-500/10' },
  write: { color: 'text-pink-500', bg: 'bg-pink-500/10' },
  quick: { color: 'text-amber-500', bg: 'bg-amber-500/10' },
};

interface ChatWidgetSuggestionsProps {
  onSelect: (prompt: string) => void;
  className?: string;
}

export const ChatWidgetSuggestions = memo(function ChatWidgetSuggestions({
  onSelect,
  className,
}: ChatWidgetSuggestionsProps) {
  const t = useTranslations('chatWidget.suggestions');
  const [expanded, setExpanded] = useState(false);

  const QUICK_SUGGESTIONS: QuickSuggestion[] = useMemo(
    () => [
      {
        icon: <MessageSquare className="h-4 w-4" />,
        label: t('explain'),
        description: t('explainPrompt'),
        prompt: t('explainPrompt'),
        visibility: 'common',
        category: 'general',
      },
      {
        icon: <Code className="h-4 w-4" />,
        label: t('writeCode'),
        description: t('writeCodePrompt'),
        prompt: t('writeCodePrompt'),
        visibility: 'common',
        category: 'code',
      },
      {
        icon: <Languages className="h-4 w-4" />,
        label: t('translate'),
        description: t('translatePrompt'),
        prompt: t('translatePrompt'),
        visibility: 'common',
        category: 'write',
      },
      {
        icon: <HelpCircle className="h-4 w-4" />,
        label: t('howTo'),
        description: t('howToPrompt'),
        prompt: t('howToPrompt'),
        visibility: 'common',
        category: 'explore',
      },
      {
        icon: <FileText className="h-4 w-4" />,
        label: t('summarize'),
        description: t('summarizePrompt'),
        prompt: t('summarizePrompt'),
        visibility: 'advanced',
        category: 'write',
      },
      {
        icon: <Sparkles className="h-4 w-4" />,
        label: t('optimize'),
        description: t('optimizePrompt'),
        prompt: t('optimizePrompt'),
        visibility: 'advanced',
        category: 'code',
      },
      {
        icon: <Brain className="h-4 w-4" />,
        label: t('brainstorm'),
        description: t('brainstormPrompt'),
        prompt: t('brainstormPrompt'),
        visibility: 'advanced',
        category: 'general',
      },
      {
        icon: <CheckCircle className="h-4 w-4" />,
        label: t('checkErrors'),
        description: t('checkErrorsPrompt'),
        prompt: t('checkErrorsPrompt'),
        visibility: 'advanced',
        category: 'code',
      },
    ],
    [t]
  );

  const commonSuggestions = QUICK_SUGGESTIONS.filter((s) => s.visibility === 'common');
  const advancedSuggestions = QUICK_SUGGESTIONS.filter((s) => s.visibility === 'advanced');

  return (
    <div className={cn('px-3 pb-2', className)}>
      <div className="grid grid-cols-2 gap-1.5">
        {/* Common suggestions - card grid */}
        {commonSuggestions.map((suggestion, index) => {
          const style = categoryStyles[suggestion.category];
          return (
            <motion.button
              key={`common-${index}`}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.06, ease: 'easeOut' }}
              className={cn(
                'group flex items-start gap-2 p-2.5 rounded-xl text-left',
                'border border-border/40 bg-card/60 backdrop-blur-sm',
                'hover:bg-accent/60 hover:border-border/60 hover:shadow-sm',
                'transition-all duration-200 cursor-pointer'
              )}
              onClick={() => onSelect(suggestion.prompt)}
            >
              <div className={cn('flex items-center justify-center h-7 w-7 rounded-lg shrink-0', style.bg)}>
                <span className={style.color}>{suggestion.icon}</span>
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <span className="text-xs font-medium leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                  {suggestion.label}
                </span>
                <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                  {suggestion.description}
                </p>
              </div>
              <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all shrink-0 mt-1" />
            </motion.button>
          );
        })}

        {/* Advanced suggestions - animated */}
        <AnimatePresence mode="popLayout">
          {expanded &&
            advancedSuggestions.map((suggestion, index) => {
              const style = categoryStyles[suggestion.category];
              return (
                <motion.button
                  key={`advanced-${index}`}
                  type="button"
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.2, delay: index * 0.04, ease: 'easeOut' }}
                  className={cn(
                    'group flex items-start gap-2 p-2.5 rounded-xl text-left',
                    'border border-border/40 bg-card/60 backdrop-blur-sm',
                    'hover:bg-accent/60 hover:border-border/60 hover:shadow-sm',
                    'transition-all duration-200 cursor-pointer'
                  )}
                  onClick={() => onSelect(suggestion.prompt)}
                >
                  <div className={cn('flex items-center justify-center h-7 w-7 rounded-lg shrink-0', style.bg)}>
                    <span className={style.color}>{suggestion.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <span className="text-xs font-medium leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                      {suggestion.label}
                    </span>
                    <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                      {suggestion.description}
                    </p>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all shrink-0 mt-1" />
                </motion.button>
              );
            })}
        </AnimatePresence>
      </div>

      {/* Expand/Collapse button */}
      {advancedSuggestions.length > 0 && (
        <div className="flex justify-center mt-1.5">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-6 px-3 rounded-full',
              'text-[11px] font-medium text-muted-foreground',
              'hover:bg-muted/60 hover:text-foreground',
              'transition-all duration-200'
            )}
            onClick={() => setExpanded(!expanded)}
          >
            <motion.span
              className="flex items-center gap-1"
              initial={false}
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-3 w-3" />
            </motion.span>
            <span className="ml-1">{expanded ? t('collapse') : t('more')}</span>
          </Button>
        </div>
      )}
    </div>
  );
});

export default ChatWidgetSuggestions;
