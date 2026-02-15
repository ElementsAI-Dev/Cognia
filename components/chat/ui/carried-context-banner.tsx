'use client';

/**
 * CarriedContextBanner - Displays carried context from previous session when mode switching
 * 
 * Shows the summary from the previous conversation that was carried over
 * and allows user to dismiss or use it as context.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Bot,
  Search,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { ChatMode } from '@/types';

interface CarriedContextBannerProps {
  fromMode: ChatMode;
  toMode: ChatMode;
  summary: string;
  carriedAt: Date;
  onDismiss?: () => void;
  className?: string;
}

const MODE_ICONS: Record<ChatMode, React.ReactNode> = {
  chat: <Sparkles className="h-4 w-4" />,
  agent: <Bot className="h-4 w-4" />,
  research: <Search className="h-4 w-4" />,
  learning: <GraduationCap className="h-4 w-4" />,
};

const MODE_COLORS: Record<ChatMode, string> = {
  chat: 'text-blue-600 bg-blue-500/10',
  agent: 'text-green-600 bg-green-500/10',
  research: 'text-orange-600 bg-orange-500/10',
  learning: 'text-violet-600 bg-violet-500/10',
};

export function CarriedContextBanner({
  fromMode,
  toMode,
  summary,
  carriedAt,
  onDismiss,
  className,
}: CarriedContextBannerProps) {
  const t = useTranslations('carriedContext');
  const tChat = useTranslations('chat');
  const [isExpanded, setIsExpanded] = useState(false);

  const modeNames: Record<ChatMode, string> = {
    chat: tChat('modeChat'),
    agent: tChat('modeAgent'),
    research: tChat('modeResearch'),
    learning: tChat('modeLearning'),
  };

  const timeAgo = getTimeAgo(carriedAt, t);

  return (
    <div
      className={cn(
        'w-full max-w-2xl mx-auto mb-4 rounded-lg border bg-card/50 backdrop-blur-sm shadow-sm animate-in fade-in-0 slide-in-from-top-4 duration-300',
        className
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between p-3 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <span>{t('title')}</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                  {timeAgo}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className={cn('flex items-center gap-0.5 px-1 py-0.5 rounded', MODE_COLORS[fromMode])}>
                  {MODE_ICONS[fromMode]}
                  <span>{modeNames[fromMode]}</span>
                </span>
                <ArrowRight className="h-3 w-3" />
                <span className={cn('flex items-center gap-0.5 px-1 py-0.5 rounded', MODE_COLORS[toMode])}>
                  {MODE_ICONS[toMode]}
                  <span>{modeNames[toMode]}</span>
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={onDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3">
            <div className="p-3 rounded-md bg-muted/50 text-sm text-muted-foreground leading-relaxed">
              {summary}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('contextHint')}
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function getTimeAgo(date: Date, t: ReturnType<typeof useTranslations>): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return t('justNow');
  if (diffMins < 60) return t('minutesAgo', { count: diffMins });
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return t('hoursAgo', { count: diffHours });
  
  const diffDays = Math.floor(diffHours / 24);
  return t('daysAgo', { count: diffDays });
}

export default CarriedContextBanner;
