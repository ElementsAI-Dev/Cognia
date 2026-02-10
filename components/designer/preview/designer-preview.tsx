'use client';

/**
 * DesignerPreview - Interactive preview with element selection
 * Similar to V0's visual editing mode
 *
 * Features:
 * - Live preview with srcdoc for fast hot reload
 * - Console log/warn/error/info capture from iframe
 * - Runtime error capture and display
 * - Scroll position preservation across updates
 * - Element selection and hover with bidirectional sync
 * - Drag-and-drop component insertion
 * - Custom viewport dimensions support
 * - Preview toolbar with refresh, screenshot, new tab, fullscreen
 * - Collapsible console panel
 */

import { useCallback, useEffect, useRef, useState, useMemo, useDeferredValue } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';
import { useSettingsStore } from '@/stores';
import { getInsertionPoint, findElementByPattern } from '@/lib/designer/elements';
import type { ViewportSize } from '@/types/designer';
import { PreviewToolbar } from './preview-toolbar';
import { PreviewConsole } from './preview-console';
import { PreviewLoading } from './preview-loading';

interface DesignerPreviewProps {
  className?: string;
  onElementSelect?: (elementId: string | null) => void;
  onElementHover?: (elementId: string | null) => void;
}

// Wrap code for preview in iframe with console capture and error handling
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
            destructive: {
              DEFAULT: 'hsl(var(--destructive))',
              foreground: 'hsl(var(--destructive-foreground))',
            },
            ring: 'hsl(var(--ring))',
          },
          borderRadius: {
            lg: 'var(--radius)',
            md: 'calc(var(--radius) - 2px)',
            sm: 'calc(var(--radius) - 4px)',
          },
        }
      }
    }
  </script>
  <script>
    // Console capture - intercept all console methods and forward to parent
    (function() {
      var origConsole = {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        info: console.info.bind(console),
      };
      function serialize(args) {
        return Array.from(args).map(function(arg) {
          if (arg === null) return 'null';
          if (arg === undefined) return 'undefined';
          if (typeof arg === 'object') {
            try { return JSON.stringify(arg, null, 2); }
            catch(e) { return String(arg); }
          }
          return String(arg);
        }).join(' ');
      }
      ['log', 'warn', 'error', 'info'].forEach(function(level) {
        console[level] = function() {
          origConsole[level].apply(console, arguments);
          try {
            window.parent.postMessage({
              type: 'preview-console',
              level: level,
              message: serialize(arguments),
              timestamp: Date.now(),
            }, '*');
          } catch(e) {}
        };
      });
      // Capture uncaught errors
      window.onerror = function(message, source, lineno, colno, error) {
        var msg = message + (source ? ' at ' + source : '') + (lineno ? ':' + lineno : '');
        window.parent.postMessage({
          type: 'preview-error',
          message: msg,
          stack: error ? error.stack : '',
        }, '*');
        window.parent.postMessage({
          type: 'preview-console',
          level: 'error',
          message: '[Runtime Error] ' + msg,
          timestamp: Date.now(),
        }, '*');
      };
      // Capture unhandled promise rejections
      window.addEventListener('unhandledrejection', function(event) {
        var msg = 'Unhandled Promise Rejection: ' + (event.reason ? (event.reason.message || String(event.reason)) : 'unknown');
        window.parent.postMessage({
          type: 'preview-error',
          message: msg,
          stack: event.reason && event.reason.stack ? event.reason.stack : '',
        }, '*');
        window.parent.postMessage({
          type: 'preview-console',
          level: 'error',
          message: msg,
          timestamp: Date.now(),
        }, '*');
      });
      // Notify parent that preview is ready
      window.addEventListener('DOMContentLoaded', function() {
        window.parent.postMessage({ type: 'preview-ready' }, '*');
      });
    })();
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
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 210 40% 98%;
      --ring: 222.2 84% 4.9%;
      --radius: 0.5rem;
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
      --destructive: 0 62.8% 30.6%;
      --destructive-foreground: 210 40% 98%;
      --ring: 212.7 26.8% 83.9%;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
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
    /* Spacing measurement overlay */
    [data-element-id].selected::before {
      content: attr(data-element-id);
      position: absolute;
      top: -18px;
      left: 0;
      font-size: 10px;
      padding: 1px 4px;
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      border-radius: 2px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 10000;
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
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        window.parent.postMessage({
          type: 'element-select',
          elementId: element.getAttribute('data-element-id'),
          tagName: element.tagName.toLowerCase(),
          className: element.className.replace('selected', '').trim(),
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          computedStyles: {
            padding: computedStyle.padding,
            margin: computedStyle.margin,
            display: computedStyle.display,
            position: computedStyle.position,
          },
        }, '*');
      }
    });

    // Handle hover with spacing measurement
    let lastHoveredId = null;
    document.addEventListener('mouseover', (e) => {
      const element = e.target.closest('[data-element-id]');
      if (element) {
        const elId = element.getAttribute('data-element-id');
        if (elId !== lastHoveredId) {
          lastHoveredId = elId;
          const rect = element.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(element);
          window.parent.postMessage({
            type: 'element-hover',
            elementId: elId,
            rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
            spacing: {
              paddingTop: computedStyle.paddingTop,
              paddingRight: computedStyle.paddingRight,
              paddingBottom: computedStyle.paddingBottom,
              paddingLeft: computedStyle.paddingLeft,
              marginTop: computedStyle.marginTop,
              marginRight: computedStyle.marginRight,
              marginBottom: computedStyle.marginBottom,
              marginLeft: computedStyle.marginLeft,
            },
          }, '*');
        }
      }
    });

    document.addEventListener('mouseout', (e) => {
      lastHoveredId = null;
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
      } else if (e.data.type === 'get-scroll-position') {
        window.parent.postMessage({
          type: 'scroll-position',
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        }, '*');
      } else if (e.data.type === 'restore-scroll-position') {
        window.scrollTo(e.data.scrollX || 0, e.data.scrollY || 0);
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
  const scrollPositionRef = useRef<{ scrollX: number; scrollY: number }>({ scrollX: 0, scrollY: 0 });
  const isFirstLoadRef = useRef(true);

  const storeCode = useDesignerStore((state) => state.code);
  // Use deferred value to reduce preview refresh frequency during rapid typing
  const code = useDeferredValue(storeCode);
  const mode = useDesignerStore((state) => state.mode);
  const viewport = useDesignerStore((state) => state.viewport);
  const customViewport = useDesignerStore((state) => state.customViewport);
  const zoom = useDesignerStore((state) => state.zoom);
  const selectElement = useDesignerStore((state) => state.selectElement);
  const hoverElement = useDesignerStore((state) => state.hoverElement);
  const selectedElementId = useDesignerStore((state) => state.selectedElementId);
  const hoveredElementId = useDesignerStore((state) => state.hoveredElementId);
  const parseCodeToElements = useDesignerStore((state) => state.parseCodeToElements);
  const setCode = useDesignerStore((state) => state.setCode);
  const addConsoleLog = useDesignerStore((state) => state.addConsoleLog);
  const addPreviewError = useDesignerStore((state) => state.addPreviewError);
  const clearPreviewErrors = useDesignerStore((state) => state.clearPreviewErrors);

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

  // Calculate viewport dimensions (supports custom viewport)
  const viewportStyle = useMemo(() => {
    if (customViewport) {
      return {
        width: `${customViewport.width}px`,
        height: `${customViewport.height}px`,
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'top center' as const,
      };
    }

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
        transformOrigin: 'top left' as const,
      };
    }

    return {
      width: `${preset.width}px`,
      height: preset.height === 'auto' ? '100%' : `${preset.height}px`,
      transform: `scale(${zoom / 100})`,
      transformOrigin: 'top center' as const,
    };
  }, [viewport, customViewport, zoom]);

  // Handle messages from iframe (console, errors, element events, scroll)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data.type !== 'string') return;
      
      switch (data.type) {
        case 'element-select':
          selectElement(data.elementId);
          onElementSelect?.(data.elementId);
          break;

        case 'element-hover':
          hoverElement(data.elementId);
          onElementHover?.(data.elementId);
          break;

        case 'preview-console':
          addConsoleLog({
            level: data.level,
            message: data.message,
            timestamp: data.timestamp,
          });
          break;

        case 'preview-error':
          addPreviewError(data.message);
          break;

        case 'preview-ready':
          setIsLoading(false);
          setError(null);
          // Restore scroll position after content loads
          if (!isFirstLoadRef.current && scrollPositionRef.current) {
            setTimeout(() => {
              iframeRef.current?.contentWindow?.postMessage({
                type: 'restore-scroll-position',
                ...scrollPositionRef.current,
              }, '*');
            }, 50);
          }
          isFirstLoadRef.current = false;
          break;

        case 'scroll-position':
          scrollPositionRef.current = { scrollX: data.scrollX, scrollY: data.scrollY };
          break;

        case 'component-dropped': {
          const { code: droppedCode, targetElementId } = data;
          if (droppedCode) {
            const insertCodeAtPosition = async () => {
              try {
                const insertPoint = await getInsertionPoint(code, targetElementId, 'inside');
                
                let nextCode = code;
                if (insertPoint && insertPoint.offset !== undefined) {
                  const before = code.slice(0, insertPoint.offset);
                  const after = code.slice(insertPoint.offset);
                  const indentedCode = droppedCode
                    .split('\n')
                    .map((line: string, i: number) => (i === 0 ? line : insertPoint.indentation + line))
                    .join('\n');
                  nextCode = before + '\n' + insertPoint.indentation + indentedCode + '\n' + after;
                  setCode(nextCode, true);
                } else {
                  if (targetElementId) {
                    const match = findElementByPattern(code, targetElementId);
                    if (match) {
                      const tagEnd = code.indexOf('>', match.startIndex);
                      if (tagEnd !== -1) {
                        nextCode = code.slice(0, tagEnd + 1) + '\n  ' + droppedCode + code.slice(tagEnd + 1);
                        setCode(nextCode, true);
                      }
                    }
                  } else {
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
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectElement, hoverElement, onElementSelect, onElementHover, code, setCode, parseCodeToElements, addConsoleLog, addPreviewError]);

  // Save scroll position before updating content
  const saveScrollPosition = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'get-scroll-position' }, '*');
    }
  }, []);

  // Update iframe content when code changes using srcdoc for better performance
  useEffect(() => {
    if (!iframeRef.current) return;

    // Save scroll position before update
    saveScrollPosition();
    clearPreviewErrors();

    try {
      const wrappedCode = wrapCodeForPreview(code, isDarkMode);
      setIsLoading(true);
      setError(null);
      // Use srcdoc for faster updates without blob URL management
      iframeRef.current.srcdoc = wrappedCode;
    } catch (err) {
      setTimeout(() => {
        setError(err instanceof Error ? err.message : 'Preview error');
        setIsLoading(false);
      }, 0);
    }
  }, [code, isDarkMode, saveScrollPosition, clearPreviewErrors]);

  // Refresh preview (full reload)
  const handleRefresh = useCallback(() => {
    if (iframeRef.current) {
      isFirstLoadRef.current = true;
      scrollPositionRef.current = { scrollX: 0, scrollY: 0 };
      setIsLoading(true);
      setError(null);
      const wrappedCode = wrapCodeForPreview(code, isDarkMode);
      iframeRef.current.srcdoc = wrappedCode;
    }
  }, [code, isDarkMode]);

  // Open preview in new tab
  const handleOpenNewTab = useCallback(() => {
    const wrappedCode = wrapCodeForPreview(code, isDarkMode);
    const blob = new Blob([wrappedCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [code, isDarkMode]);

  return (
    <div className={cn('relative flex flex-col h-full min-h-0 bg-muted/30', className)}>
      {/* Preview toolbar */}
      <PreviewToolbar
        onRefresh={handleRefresh}
        onOpenNewTab={handleOpenNewTab}
        iframeRef={iframeRef}
      />

      {/* Preview container */}
      <div className="flex-1 min-h-0 overflow-auto flex items-start justify-center p-4">
        <div
          className={cn(
            'relative bg-background border rounded-lg shadow-sm overflow-hidden transition-all',
            viewport === 'full' && !customViewport ? 'w-full h-full' : 'flex-shrink-0'
          )}
          style={viewport !== 'full' || customViewport ? viewportStyle : undefined}
        >
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <PreviewLoading status="rendering" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="flex flex-col items-center">
                <PreviewLoading status="error" errorMessage={error} />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('retry')}
                </Button>
              </div>
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
            style={viewport === 'full' && !customViewport ? viewportStyle : { width: '100%', height: '100%' }}
          />
        </div>
      </div>

      {/* Console panel */}
      <PreviewConsole />
    </div>
  );
}

export default DesignerPreview;
