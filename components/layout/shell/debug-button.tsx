'use client';

import { Bug } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Debug button shown only in development mode.
 * Logs environment and build info to the console for quick diagnostics.
 */
export function DebugButton() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleClick = () => {
    console.group('[Cognia Debug Info]');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('User Agent:', navigator.userAgent);
    console.log('URL:', window.location.href);
    console.log('Tauri:', typeof (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ !== 'undefined');
    console.log('Viewport:', `${window.innerWidth}x${window.innerHeight}`);
    console.log('Device Pixel Ratio:', window.devicePixelRatio);
    console.log('Memory:', (performance as unknown as Record<string, Record<string, unknown>>).memory ?? 'N/A');
    console.groupEnd();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground"
          type="button"
          aria-label="Debug info"
        >
          <Bug className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        Debug Info
      </TooltipContent>
    </Tooltip>
  );
}
