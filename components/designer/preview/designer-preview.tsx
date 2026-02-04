'use client';

/**
 * DesignerPreview - Interactive preview with element selection
 * Similar to V0's visual editing mode
 */

import { useCallback, useEffect, useRef, useState, useMemo, useDeferredValue } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';
import { useSettingsStore } from '@/stores';
import { getInsertionPoint, findElementByPattern } from '@/lib/designer/elements';
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
    [data-element-id].highlighted {
      outline: 2px dashed hsl(var(--primary) / 0.7);
      background-color: hsl(var(--primary) / 0.05);
    }
    /* Drag-drop states */
    body.drag-active {
      cursor: copy;
    }
    body.drag-active [data-element-id] {
      outline: 1px dashed hsl(var(--primary) / 0.3);
    }
    [data-element-id].drop-target {
      outline: 2px solid hsl(142 76% 36%);
      background-color: hsl(142 76% 36% / 0.1);
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

    // Listen for selection updates from parent (bidirectional sync)
    window.addEventListener('message', (e) => {
      if (e.data.type === 'select-element') {
        const elementId = e.data.elementId;
        document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        if (elementId) {
          const element = document.querySelector('[data-element-id="' + elementId + '"]');
          if (element) {
            element.classList.add('selected');
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      } else if (e.data.type === 'highlight-element') {
        const elementId = e.data.elementId;
        document.querySelectorAll('.highlighted').forEach(el => el.classList.remove('highlighted'));
        if (elementId) {
          const element = document.querySelector('[data-element-id="' + elementId + '"]');
          if (element) {
            element.classList.add('highlighted');
          }
        }
      } else if (e.data.type === 'drop-component') {
        // Handle component drop from parent
        const { code, targetElementId, position } = e.data;
        if (code) {
          window.parent.postMessage({
            type: 'component-dropped',
            code: code,
            targetElementId: targetElementId,
            position: position || 'inside',
          }, '*');
        }
      }
    });

    // Handle drag events for cross-iframe drop
    let dragOverElement = null;
    
    document.addEventListener('dragenter', (e) => {
      e.preventDefault();
      document.body.classList.add('drag-active');
    });

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      const element = e.target.closest('[data-element-id]');
      if (element && element !== dragOverElement) {
        if (dragOverElement) {
          dragOverElement.classList.remove('drop-target');
        }
        dragOverElement = element;
        element.classList.add('drop-target');
        window.parent.postMessage({
          type: 'drag-over-element',
          elementId: element.getAttribute('data-element-id'),
          rect: element.getBoundingClientRect(),
        }, '*');
      }
    });

    document.addEventListener('dragleave', (e) => {
      if (e.target === document.body || !document.body.contains(e.relatedTarget)) {
        document.body.classList.remove('drag-active');
        if (dragOverElement) {
          dragOverElement.classList.remove('drop-target');
          dragOverElement = null;
        }
      }
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      document.body.classList.remove('drag-active');
      
      const element = e.target.closest('[data-element-id]');
      const targetId = element ? element.getAttribute('data-element-id') : null;
      
      if (dragOverElement) {
        dragOverElement.classList.remove('drop-target');
        dragOverElement = null;
      }

      // Get drop data from dataTransfer
      const componentData = e.dataTransfer.getData('application/json');
      if (componentData) {
        try {
          const data = JSON.parse(componentData);
          window.parent.postMessage({
            type: 'component-dropped',
            code: data.code,
            targetElementId: targetId,
            position: 'inside',
          }, '*');
        } catch (err) {
          console.error('Failed to parse drop data:', err);
        }
      }
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

  const storeCode = useDesignerStore((state) => state.code);
  // Use deferred value to reduce preview refresh frequency during rapid typing
  const code = useDeferredValue(storeCode);
  const mode = useDesignerStore((state) => state.mode);
  const viewport = useDesignerStore((state) => state.viewport);
  const zoom = useDesignerStore((state) => state.zoom);
  const selectElement = useDesignerStore((state) => state.selectElement);
  const hoverElement = useDesignerStore((state) => state.hoverElement);
  const selectedElementId = useDesignerStore((state) => state.selectedElementId);
  const hoveredElementId = useDesignerStore((state) => state.hoveredElementId);
  const parseCodeToElements = useDesignerStore((state) => state.parseCodeToElements);
  const setCode = useDesignerStore((state) => state.setCode);

  const isDarkMode = useSettingsStore((state) => state.theme === 'dark');

  // Sync selection from store to iframe (bidirectional sync)
  useEffect(() => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({
      type: 'select-element',
      elementId: selectedElementId,
    }, '*');
  }, [selectedElementId]);

  // Sync hover from store to iframe (bidirectional sync)
  useEffect(() => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({
      type: 'highlight-element',
      elementId: hoveredElementId,
    }, '*');
  }, [hoveredElementId]);

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
      } else if (data.type === 'component-dropped') {
        // Handle component drop - insert code into the design using element-locator
        const { code: droppedCode, targetElementId } = data;
        if (droppedCode) {
          // Use element-locator for accurate code insertion
          const insertCodeAtPosition = async () => {
            try {
              const insertPoint = await getInsertionPoint(code, targetElementId, 'inside');
              
              let nextCode = code;
              if (insertPoint && insertPoint.offset !== undefined) {
                // Insert at calculated position with proper indentation
                const before = code.slice(0, insertPoint.offset);
                const after = code.slice(insertPoint.offset);
                const indentedCode = droppedCode
                  .split('\n')
                  .map((line: string, i: number) => (i === 0 ? line : insertPoint.indentation + line))
                  .join('\n');
                nextCode = before + '\n' + insertPoint.indentation + indentedCode + '\n' + after;
                setCode(nextCode, true);
              } else {
                // Fallback: use pattern matching to find insertion point
                if (targetElementId) {
                  const match = findElementByPattern(code, targetElementId);
                  if (match) {
                    // Find the closing > of the opening tag
                    const tagEnd = code.indexOf('>', match.startIndex);
                    if (tagEnd !== -1) {
                      nextCode = code.slice(0, tagEnd + 1) + '\n  ' + droppedCode + code.slice(tagEnd + 1);
                      setCode(nextCode, true);
                    }
                  }
                } else {
                  // Append to root
                  const insertIdx = code.lastIndexOf('</');
                  if (insertIdx !== -1) {
                    nextCode = code.slice(0, insertIdx) + '\n' + droppedCode + '\n' + code.slice(insertIdx);
                    setCode(nextCode, true);
                  }
                }
              }
              void parseCodeToElements(nextCode);
            } catch (err) {
              console.error('Failed to insert code:', err);
            }
          };
          insertCodeAtPosition();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectElement, hoverElement, onElementSelect, onElementHover, code, setCode, parseCodeToElements]);

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
    <div className={cn('relative flex flex-col h-full min-h-0 bg-muted/30', className)}>
      {/* Preview container */}
      <div className="flex-1 min-h-0 overflow-auto flex items-start justify-center p-4">
        <div
          className={cn(
            'relative bg-background border rounded-lg shadow-sm overflow-hidden transition-all',
            viewport === 'full' ? 'w-full h-full' : 'flex-shrink-0'
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
