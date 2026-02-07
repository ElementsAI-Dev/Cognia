'use client';

/**
 * PreviewToolbar - Compact toolbar for the preview panel
 * Provides refresh, new tab, screenshot, console toggle, and viewport info
 */

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  RefreshCw,
  ExternalLink,
  Camera,
  Terminal,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';

interface PreviewToolbarProps {
  className?: string;
  onRefresh?: () => void;
  onScreenshot?: () => Promise<void>;
  onOpenNewTab?: () => void;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

export function PreviewToolbar({
  className,
  onRefresh,
  onScreenshot,
  onOpenNewTab,
  iframeRef,
}: PreviewToolbarProps) {
  const t = useTranslations('designer');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const viewport = useDesignerStore((state) => state.viewport);
  const customViewport = useDesignerStore((state) => state.customViewport);
  const zoom = useDesignerStore((state) => state.zoom);
  const showConsole = useDesignerStore((state) => state.showConsole);
  const toggleConsole = useDesignerStore((state) => state.toggleConsole);
  const consoleLogs = useDesignerStore((state) => state.consoleLogs);

  const errorCount = consoleLogs.filter((l) => l.level === 'error').length;

  // Open preview in new tab
  const handleOpenNewTab = useCallback(() => {
    if (onOpenNewTab) {
      onOpenNewTab();
      return;
    }
    // Fallback: extract iframe content and open in new tab
    if (iframeRef?.current) {
      try {
        const iframeDoc = iframeRef.current.contentDocument;
        if (iframeDoc) {
          const html = iframeDoc.documentElement.outerHTML;
          const blob = new Blob([html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          // Revoke after a delay to allow the new tab to load
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }
      } catch {
        console.error('Cannot access iframe content due to cross-origin restrictions');
      }
    }
  }, [onOpenNewTab, iframeRef]);

  // Screenshot preview
  const handleScreenshot = useCallback(async () => {
    if (onScreenshot) {
      setIsCapturing(true);
      try {
        await onScreenshot();
      } finally {
        setIsCapturing(false);
      }
      return;
    }
    // Fallback: use html2canvas-like approach via canvas
    if (iframeRef?.current) {
      setIsCapturing(true);
      try {
        const iframeDoc = iframeRef.current.contentDocument;
        if (iframeDoc) {
          const html = iframeDoc.documentElement.outerHTML;
          const blob = new Blob([html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          // Copy URL to clipboard as fallback
          await navigator.clipboard.writeText(url);
          URL.revokeObjectURL(url);
        }
      } catch {
        console.error('Screenshot capture failed');
      } finally {
        setIsCapturing(false);
      }
    }
  }, [onScreenshot, iframeRef]);

  // Toggle fullscreen
  const handleToggleFullscreen = useCallback(() => {
    const container = iframeRef?.current?.parentElement?.parentElement;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen, iframeRef]);

  // Get viewport display text
  const getViewportText = useCallback(() => {
    if (customViewport) {
      return `${customViewport.width}×${customViewport.height}`;
    }
    const presets: Record<string, string> = {
      mobile: '375×667',
      tablet: '768×1024',
      desktop: '1280×800',
      full: 'Full',
    };
    return presets[viewport] || viewport;
  }, [viewport, customViewport]);

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center justify-between px-2 py-1 border-b bg-muted/30 text-xs',
          className
        )}
      >
        {/* Left: viewport info */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="font-mono text-[11px]">{getViewportText()}</span>
          <span className="text-muted-foreground/40">@</span>
          <span className="font-mono text-[11px]">{zoom}%</span>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-0.5">
          {/* Console toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showConsole ? 'secondary' : 'ghost'}
                size="icon"
                className="h-6 w-6 relative"
                onClick={toggleConsole}
              >
                <Terminal className="h-3.5 w-3.5" />
                {errorCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-3.5 w-3.5 p-0 flex items-center justify-center text-[9px]"
                  >
                    {errorCount > 9 ? '9+' : errorCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('console') || 'Console'}</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-4 mx-0.5" />

          {/* Refresh */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onRefresh}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('refreshPreview') || 'Refresh Preview'}</TooltipContent>
          </Tooltip>

          {/* Screenshot */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleScreenshot}
                disabled={isCapturing}
              >
                <Camera className={cn('h-3.5 w-3.5', isCapturing && 'animate-pulse')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('screenshotPreview') || 'Screenshot'}</TooltipContent>
          </Tooltip>

          {/* Fullscreen */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleToggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isFullscreen
                ? (t('exitFullscreen') || 'Exit Fullscreen')
                : (t('fullscreen') || 'Fullscreen')}
            </TooltipContent>
          </Tooltip>

          {/* Open in new tab */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleOpenNewTab}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('openInNewTab') || 'Open in New Tab'}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default PreviewToolbar;
