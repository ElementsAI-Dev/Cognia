'use client';

/**
 * VegaLiteBlock - Renders VegaLite charts in chat messages
 */

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Copy, Check, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface VegaLiteBlockProps {
  content: string;
  className?: string;
}

export function VegaLiteBlock({ content, className }: VegaLiteBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const renderChart = async (container: HTMLDivElement | null, spec: object) => {
    if (!container) return;

    try {
      const vegaEmbed = (await import('vega-embed')).default;
      
      await vegaEmbed(container, spec as never, {
        actions: false,
        renderer: 'svg',
        theme: document.documentElement.classList.contains('dark') ? 'dark' : undefined,
      });
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    let mounted = true;

    const render = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const spec = JSON.parse(content);
        
        if (mounted && containerRef.current) {
          await renderChart(containerRef.current, spec);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to render chart');
          setIsLoading(false);
        }
      }
    };

    render();

    return () => {
      mounted = false;
    };
  }, [content]);

  useEffect(() => {
    if (isFullscreen && fullscreenRef.current) {
      try {
        const spec = JSON.parse(content);
        renderChart(fullscreenRef.current, spec);
      } catch {
        // Error already handled in main render
      }
    }
  }, [isFullscreen, content]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-6 rounded-lg bg-muted/30 border', className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">Rendering chart...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex flex-col gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20', className)}>
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">VegaLite Error</span>
        </div>
        <p className="text-xs text-muted-foreground">{error}</p>
        <pre className="mt-2 p-2 rounded bg-muted text-xs overflow-auto max-h-32">
          <code>{content}</code>
        </pre>
      </div>
    );
  }

  return (
    <>
      <div className={cn('group relative rounded-lg border bg-card overflow-hidden', className)}>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsFullscreen(true)}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div
          ref={containerRef}
          className="flex items-center justify-center overflow-auto p-4"
        />
      </div>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>VegaLite Chart</DialogTitle>
          </DialogHeader>
          <div
            ref={fullscreenRef}
            className="flex items-center justify-center p-4"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
