'use client';

/**
 * DesignerPreview - Interactive preview with element selection
 * Similar to V0's visual editing mode
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';
import { useSettingsStore } from '@/stores';
import type { ViewportSize } from '@/types/designer';

interface DesignerPreviewProps {
  className?: string;
  onElementSelect?: (elementId: string | null) => void;
  onElementHover?: (elementId: string | null) => void;
}

// Wrap code for preview in iframe
function wrapCodeForPreview(code: string, isDarkMode: boolean): string {
  const tailwindCDN = 'https://cdn.tailwindcss.com';
  
  return `
<!DOCTYPE html>
<html lang="en" class="${isDarkMode ? 'dark' : ''}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="${tailwindCDN}"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            border: 'hsl(var(--border))',
            background: 'hsl(var(--background))',
            foreground: 'hsl(var(--foreground))',
            primary: {
              DEFAULT: 'hsl(var(--primary))',
              foreground: 'hsl(var(--primary-foreground))',
            },
            secondary: {
              DEFAULT: 'hsl(var(--secondary))',
              foreground: 'hsl(var(--secondary-foreground))',
            },
            muted: {
              DEFAULT: 'hsl(var(--muted))',
              foreground: 'hsl(var(--muted-foreground))',
            },
            accent: {
              DEFAULT: 'hsl(var(--accent))',
              foreground: 'hsl(var(--accent-foreground))',
            },
            card: {
              DEFAULT: 'hsl(var(--card))',
              foreground: 'hsl(var(--card-foreground))',
            },
          }
        }
      }
    }
  </script>
  <style>
    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      --card: 0 0% 100%;
      --card-foreground: 222.2 84% 4.9%;
      --primary: 222.2 47.4% 11.2%;
      --primary-foreground: 210 40% 98%;
      --secondary: 210 40% 96.1%;
      --secondary-foreground: 222.2 47.4% 11.2%;
      --muted: 210 40% 96.1%;
      --muted-foreground: 215.4 16.3% 46.9%;
      --accent: 210 40% 96.1%;
      --accent-foreground: 222.2 47.4% 11.2%;
      --border: 214.3 31.8% 91.4%;
    }
    .dark {
      --background: 222.2 84% 4.9%;
      --foreground: 210 40% 98%;
      --card: 222.2 84% 4.9%;
      --card-foreground: 210 40% 98%;
      --primary: 210 40% 98%;
      --primary-foreground: 222.2 47.4% 11.2%;
      --secondary: 217.2 32.6% 17.5%;
      --secondary-foreground: 210 40% 98%;
      --muted: 217.2 32.6% 17.5%;
      --muted-foreground: 215 20.2% 65.1%;
      --accent: 217.2 32.6% 17.5%;
      --accent-foreground: 210 40% 98%;
      --border: 217.2 32.6% 17.5%;
    }
    body {
      background-color: hsl(var(--background));
      color: hsl(var(--foreground));
      font-family: system-ui, -apple-system, sans-serif;
    }
    [data-element-id] {
      outline: 1px dashed transparent;
      transition: outline-color 0.15s ease;
    }
    [data-element-id]:hover {
      outline-color: hsl(var(--primary) / 0.5);
    }
    [data-element-id].selected {
      outline: 2px solid hsl(var(--primary));
    }
  </style>
</head>
<body>
  <div id="preview-root">
    ${code}
  </div>
  <script>
    // Add element IDs for selection
    let elementCounter = 0;
    function addElementIds(element) {
      if (element.nodeType === 1) {
        element.setAttribute('data-element-id', 'el-' + (elementCounter++));
        Array.from(element.children).forEach(addElementIds);
      }
    }
    addElementIds(document.getElementById('preview-root'));

    // Handle element selection
    document.addEventListener('click', (e) => {
      const element = e.target.closest('[data-element-id]');
      if (element) {
        e.preventDefault();
        e.stopPropagation();
        document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');
        window.parent.postMessage({
          type: 'element-select',
          elementId: element.getAttribute('data-element-id'),
          tagName: element.tagName.toLowerCase(),
          className: element.className.replace('selected', '').trim(),
          rect: element.getBoundingClientRect(),
        }, '*');
      }
    });

    // Handle hover
    document.addEventListener('mouseover', (e) => {
      const element = e.target.closest('[data-element-id]');
      if (element) {
        window.parent.postMessage({
          type: 'element-hover',
          elementId: element.getAttribute('data-element-id'),
          rect: element.getBoundingClientRect(),
        }, '*');
      }
    });

    document.addEventListener('mouseout', (e) => {
      window.parent.postMessage({ type: 'element-hover', elementId: null }, '*');
    });
  </script>
</body>
</html>
  `.trim();
}

export function DesignerPreview({
  className,
  onElementSelect,
  onElementHover,
}: DesignerPreviewProps) {
  const t = useTranslations('designer');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const code = useDesignerStore((state) => state.code);
  const mode = useDesignerStore((state) => state.mode);
  const viewport = useDesignerStore((state) => state.viewport);
  const zoom = useDesignerStore((state) => state.zoom);
  const selectElement = useDesignerStore((state) => state.selectElement);
  const hoverElement = useDesignerStore((state) => state.hoverElement);

  const isDarkMode = useSettingsStore((state) => state.theme === 'dark');

  // Calculate viewport dimensions
  const viewportStyle = useMemo(() => {
    const presets: Record<ViewportSize, { width: number; height: number | 'auto' }> = {
      mobile: { width: 375, height: 667 },
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1280, height: 800 },
      full: { width: 0, height: 'auto' },
    };

    const preset = presets[viewport];
    
    if (viewport === 'full') {
      return {
        width: '100%',
        height: '100%',
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'top left',
      };
    }

    return {
      width: `${preset.width}px`,
      height: preset.height === 'auto' ? '100%' : `${preset.height}px`,
      transform: `scale(${zoom / 100})`,
      transformOrigin: 'top center',
    };
  }, [viewport, zoom]);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      
      if (data.type === 'element-select') {
        selectElement(data.elementId);
        onElementSelect?.(data.elementId);
      } else if (data.type === 'element-hover') {
        hoverElement(data.elementId);
        onElementHover?.(data.elementId);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectElement, hoverElement, onElementSelect, onElementHover]);

  // Update iframe content when code changes
  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    let url: string | null = null;
    let isMounted = true;

    const handleError = (message: string) => {
      if (isMounted) {
        setError(message);
        setIsLoading(false);
      }
    };

    try {
      const wrappedCode = wrapCodeForPreview(code, isDarkMode);
      const blob = new Blob([wrappedCode], { type: 'text/html' });
      url = URL.createObjectURL(blob);
      
      iframe.onload = () => {
        if (isMounted) setIsLoading(false);
        if (url) URL.revokeObjectURL(url);
      };

      iframe.onerror = () => {
        handleError('Failed to load preview');
        if (url) URL.revokeObjectURL(url);
      };

      iframe.src = url;
    } catch (err) {
      // Defer error handling to next tick to avoid synchronous setState
      setTimeout(() => {
        handleError(err instanceof Error ? err.message : 'Preview error');
      }, 0);
    }

    return () => {
      isMounted = false;
    };
  }, [code, isDarkMode]);

  // Refresh preview
  const handleRefresh = useCallback(() => {
    if (iframeRef.current) {
      setIsLoading(true);
      const wrappedCode = wrapCodeForPreview(code, isDarkMode);
      const blob = new Blob([wrappedCode], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;
    }
  }, [code, isDarkMode]);

  return (
    <div className={cn('relative flex flex-col h-full bg-muted/30', className)}>
      {/* Preview container */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4">
        <div
          className={cn(
            'relative bg-background border rounded-lg shadow-sm overflow-hidden transition-all',
            viewport === 'full' && 'w-full h-full'
          )}
          style={viewport !== 'full' ? viewportStyle : undefined}
        >
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 p-4">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-sm text-destructive text-center">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('retry')}
              </Button>
            </div>
          )}

          {/* Preview iframe */}
          <iframe
            ref={iframeRef}
            title="Designer Preview"
            className={cn(
              'w-full h-full border-0',
              mode === 'design' && 'pointer-events-auto',
              mode === 'preview' && 'pointer-events-auto'
            )}
            sandbox="allow-scripts allow-same-origin"
            style={viewport === 'full' ? viewportStyle : { width: '100%', height: '100%' }}
          />
        </div>
      </div>

      {/* Viewport indicator */}
      <div className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
        {viewport} • {zoom}%
      </div>
    </div>
  );
}

export default DesignerPreview;
