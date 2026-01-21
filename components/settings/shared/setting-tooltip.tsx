'use client';

/**
 * SettingTooltip - Reusable tooltip component for settings
 * Displays an info icon with hover tooltip for setting descriptions
 */

import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SettingTooltipProps {
  children: React.ReactNode;
  content: string;
}

export function SettingTooltip({ children, content }: SettingTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 cursor-help">
          {children}
          <Info className="h-3 w-3 text-muted-foreground" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default SettingTooltip;
