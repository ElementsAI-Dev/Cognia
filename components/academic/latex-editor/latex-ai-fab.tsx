'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LatexAIFabProps {
  onClick: () => void;
  className?: string;
}

export function LatexAIFab({ onClick, className }: LatexAIFabProps) {
  const t = useTranslations('latex');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              'fixed right-6 bottom-6 z-50',
              'h-14 w-14 rounded-full',
              'bg-linear-to-br from-violet-600 to-blue-500 text-white',
              'shadow-xl shadow-violet-600/25',
              'hover:shadow-2xl hover:shadow-violet-600/30',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
              'transition-shadow',
              className
            )}
          >
            <Sparkles className="h-5 w-5 mx-auto" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-gray-900 text-white border-gray-800">
          <div className="flex items-center gap-2">
            <span>{t('ai.chat.title')}</span>
            <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-200">Ctrl+K</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default LatexAIFab;
