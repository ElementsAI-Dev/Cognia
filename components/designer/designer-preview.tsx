'use client';

/**
 * DesignerPreview - Interactive preview with element selection and highlighting
 * Similar to V0's visual editing mode
 *
 * Features:
 * - CDN fallback for core libraries (React, Babel, Tailwind)
 * - Error handling with user feedback
 * - Tailwind load synchronization to prevent race conditions
 * - Dark mode support
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDesignerStore } from '@/stores/designer-store';
import { VIEWPORT_PRESETS } from '@/types/designer';
import { CORE_LIBRARY_CDNS } from '@/lib/designer/cdn-resolver';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface DesignerPreviewProps {
  className?: string;
  onError?: (error: string) => void;
}

type PreviewError = {
  type: 'cdn' | 'syntax' | 'runtime' | 'timeout';
  message: string;
  details?: string;
} | null;

export function DesignerPreview({ className, onError }: DesignerPreviewProps) {
  const t = useTranslations('designer');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<PreviewError>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mode = useDesignerStore((state) => state.mode);
  const code = useDesignerStore((state) => state.code);
  const viewport = useDesignerStore((state) => state.viewport);
  const zoom = useDesignerStore((state) => state.zoom);
  const selectedElementId = useDesignerStore((state) => state.selectedElementId);
  const hoveredElementId = useDesignerStore((state) => state.hoveredElementId);
  const selectElement = useDesignerStore((state) => state.selectElement);
  const hoverElement = useDesignerStore((state) => state.hoverElement);
  const parseCodeToElements = useDesignerStore((state) => state.parseCodeToElements);

  const viewportDimensions = VIEWPORT_PRESETS[viewport];

  // Handle error from iframe or internal
  const handleError = useCallback((err: PreviewError) => {
    setError(err);
    if (err && onError) {
      onError(err.message);
    }
  }, [onError]);

  // Retry loading the preview
  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    setError(null);
    setIsLoaded(false);

    // Force reload by re-triggering the effect
    setTimeout(() => {
      setIsRetrying(false);
    }, 100);
  }, []);

  // Inject the code into iframe
  useEffect(() => {
    if (!iframeRef.current || isRetrying) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    if (!doc) return;

    // Clear previous timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    // Set loading timeout (10 seconds)
    loadTimeoutRef.current = setTimeout(() => {
      if (!isLoaded) {
        handleError({
          type: 'timeout',
          message: 'Preview loading timed out',
          details: 'The preview took too long to load. This may be due to CDN issues or network problems.',
        });
      }
    }, 10000);

    try {
      const wrappedCode = wrapCodeForPreview(code, mode === 'design');

      doc.open();
      doc.write(wrappedCode);
      doc.close();

      // Parse code to element tree
      parseCodeToElements(code);

      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        setIsLoaded(true);
        setError(null);
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
      });
    } catch (err) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        handleError({
          type: 'syntax',
          message: 'Failed to render preview',
          details: err instanceof Error ? err.message : 'Unknown error',
        });
      });
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [code, mode, parseCodeToElements, isRetrying, isLoaded, handleError]);

  // Handle messages from iframe (element selection, hover, errors)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'element-click') {
        selectElement(event.data.elementId);
      } else if (event.data.type === 'element-hover') {
        hoverElement(event.data.elementId);
      } else if (event.data.type === 'element-leave') {
        hoverElement(null);
      } else if (event.data.type === 'preview-error') {
        handleError({
          type: event.data.errorType || 'runtime',
          message: event.data.message || 'Preview error',
          details: event.data.details,
        });
      } else if (event.data.type === 'preview-ready') {
        setIsLoaded(true);
        setError(null);
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectElement, hoverElement, handleError]);

  // Sync selection highlight to iframe
  useEffect(() => {
    if (!iframeRef.current?.contentWindow) return;
    
    iframeRef.current.contentWindow.postMessage({
      type: 'highlight-element',
      selectedId: selectedElementId,
      hoveredId: hoveredElementId,
    }, '*');
  }, [selectedElementId, hoveredElementId]);

  const getContainerStyle = useCallback(() => {
    if (viewport === 'full') {
      return { width: '100%', height: '100%' };
    }
    
    return {
      width: viewportDimensions.width,
      height: viewportDimensions.height === 'auto' ? '100%' : viewportDimensions.height,
    };
  }, [viewport, viewportDimensions]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex items-center justify-center overflow-auto bg-muted/30 p-4',
        className
      )}
    >
      {/* Viewport container */}
      <div
        className={cn(
          'relative bg-white shadow-lg transition-all duration-300',
          viewport !== 'full' && 'rounded-lg border'
        )}
        style={{
          ...getContainerStyle(),
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Device frame for mobile/tablet */}
        {viewport === 'mobile' && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-muted rounded-full" />
        )}
        
        <iframe
          ref={iframeRef}
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title={t('preview')}
        />

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/95 p-4">
            <div className="max-w-md text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{error.message}</h3>
                {error.details && (
                  <p className="text-sm text-muted-foreground">{error.details}</p>
                )}
                <Badge variant="outline" className="mt-2">
                  {error.type === 'cdn' && 'CDN Error'}
                  {error.type === 'syntax' && 'Syntax Error'}
                  {error.type === 'runtime' && 'Runtime Error'}
                  {error.type === 'timeout' && 'Timeout'}
                </Badge>
              </div>
              <Button onClick={handleRetry} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {!isLoaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="space-y-3 w-full max-w-sm p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        )}
      </div>
      
      {/* Viewport label */}
      <Badge variant="outline" className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 shadow-sm">
        {viewportDimensions.label}
        {viewport !== 'full' && ` • ${viewportDimensions.width}×${viewportDimensions.height}`}
        {zoom !== 100 && ` • ${zoom}%`}
      </Badge>
    </div>
  );
}

// Wrap code for preview with design mode interactivity
function wrapCodeForPreview(code: string, designMode: boolean): string {
  const designModeScript = designMode ? `
    <script>
      (function() {
        let selectedElement = null;
        let hoveredElement = null;
        let elementIdMap = new WeakMap();
        let idCounter = 0;
        
        // Assign IDs to all elements
        function assignIds(element) {
          if (element.nodeType !== 1) return;
          const id = 'el-' + (idCounter++);
          element.dataset.designerId = id;
          elementIdMap.set(element, id);
          for (const child of element.children) {
            assignIds(child);
          }
        }
        
        // Create highlight overlay
        function createOverlay(id) {
          const overlay = document.createElement('div');
          overlay.id = id;
          overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:99999;border:2px solid;transition:all 0.15s ease;';
          document.body.appendChild(overlay);
          return overlay;
        }
        
        const selectionOverlay = createOverlay('selection-overlay');
        selectionOverlay.style.borderColor = '#3b82f6';
        selectionOverlay.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        selectionOverlay.style.display = 'none';
        
        const hoverOverlay = createOverlay('hover-overlay');
        hoverOverlay.style.borderColor = '#10b981';
        hoverOverlay.style.backgroundColor = 'rgba(16, 185, 129, 0.05)';
        hoverOverlay.style.display = 'none';
        
        // Element label
        function createLabel(overlay, color) {
          const label = document.createElement('div');
          label.style.cssText = 'position:absolute;top:-20px;left:-2px;padding:2px 6px;font-size:10px;font-family:system-ui;color:white;background:' + color + ';border-radius:2px;white-space:nowrap;';
          overlay.appendChild(label);
          return label;
        }
        
        const selectionLabel = createLabel(selectionOverlay, '#3b82f6');
        const hoverLabel = createLabel(hoverOverlay, '#10b981');
        
        function updateOverlay(overlay, label, element) {
          if (!element) {
            overlay.style.display = 'none';
            return;
          }
          
          const rect = element.getBoundingClientRect();
          overlay.style.display = 'block';
          overlay.style.top = rect.top + 'px';
          overlay.style.left = rect.left + 'px';
          overlay.style.width = rect.width + 'px';
          overlay.style.height = rect.height + 'px';
          
          const tagName = element.tagName.toLowerCase();
          const className = element.className ? '.' + element.className.split(' ')[0] : '';
          label.textContent = tagName + className;
        }
        
        // Handle click
        document.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const target = e.target;
          if (target === document.body || target === document.documentElement) return;
          
          selectedElement = target;
          updateOverlay(selectionOverlay, selectionLabel, selectedElement);
          
          window.parent.postMessage({
            type: 'element-click',
            elementId: target.dataset.designerId,
            tagName: target.tagName.toLowerCase(),
            className: target.className,
          }, '*');
        }, true);
        
        // Handle hover
        document.addEventListener('mouseover', function(e) {
          const target = e.target;
          if (target === document.body || target === document.documentElement) return;
          if (target === selectedElement) return;
          
          hoveredElement = target;
          updateOverlay(hoverOverlay, hoverLabel, hoveredElement);
          
          window.parent.postMessage({
            type: 'element-hover',
            elementId: target.dataset.designerId,
          }, '*');
        }, true);
        
        document.addEventListener('mouseout', function(e) {
          if (e.target === hoveredElement) {
            hoveredElement = null;
            hoverOverlay.style.display = 'none';
            window.parent.postMessage({ type: 'element-leave' }, '*');
          }
        }, true);
        
        // Listen for highlight commands from parent
        window.addEventListener('message', function(e) {
          if (e.data.type === 'highlight-element') {
            if (e.data.selectedId) {
              const el = document.querySelector('[data-designer-id="' + e.data.selectedId + '"]');
              if (el) {
                selectedElement = el;
                updateOverlay(selectionOverlay, selectionLabel, el);
              }
            } else {
              selectedElement = null;
              selectionOverlay.style.display = 'none';
            }
          }
        });
        
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
          assignIds(document.body);
        });
        
        // Update overlays on scroll/resize
        window.addEventListener('scroll', function() {
          updateOverlay(selectionOverlay, selectionLabel, selectedElement);
          updateOverlay(hoverOverlay, hoverLabel, hoveredElement);
        }, true);
        
        window.addEventListener('resize', function() {
          updateOverlay(selectionOverlay, selectionLabel, selectedElement);
          updateOverlay(hoverOverlay, hoverLabel, hoveredElement);
        });
      })();
    </script>
    <style>
      * { cursor: default !important; }
      a, button { pointer-events: auto; }
    </style>
  ` : '';

  // Check if it's React code or plain HTML
  const isReact = code.includes('function') && (code.includes('return') || code.includes('=>'));

  // Get CDN URLs with fallback support
  const reactCDN = CORE_LIBRARY_CDNS.react;
  const reactDomCDN = CORE_LIBRARY_CDNS.reactDom;
  const babelCDN = CORE_LIBRARY_CDNS.babel;
  const tailwindCDN = CORE_LIBRARY_CDNS.tailwind;
  const lucideCDN = CORE_LIBRARY_CDNS.lucideIcons;

  // Script to handle CDN loading errors and notify parent
  const errorHandlingScript = `
    <script>
      window.__cdnLoadErrors = [];
      window.__tailwindReady = false;

      // Report errors to parent
      function reportError(type, message, details) {
        window.parent.postMessage({
          type: 'preview-error',
          errorType: type,
          message: message,
          details: details
        }, '*');
      }

      // Report ready to parent
      function reportReady() {
        window.parent.postMessage({ type: 'preview-ready' }, '*');
      }

      // CDN load error handler
      function handleCDNError(lib, primaryUrl, fallbackUrl) {
        return function() {
          window.__cdnLoadErrors.push(lib);
          console.warn('[CDN] ' + lib + ' failed to load from ' + primaryUrl + ', trying fallback...');
          if (fallbackUrl) {
            var script = document.createElement('script');
            script.src = fallbackUrl;
            script.onerror = function() {
              reportError('cdn', lib + ' failed to load', 'Both primary and fallback CDNs failed');
            };
            document.head.appendChild(script);
          }
        };
      }

      // Wait for Tailwind to be ready
      function waitForTailwind(callback, maxWait) {
        maxWait = maxWait || 5000;
        var startTime = Date.now();

        function check() {
          if (typeof tailwind !== 'undefined' || window.__tailwindReady) {
            window.__tailwindReady = true;
            callback();
          } else if (Date.now() - startTime < maxWait) {
            requestAnimationFrame(check);
          } else {
            console.warn('[Tailwind] Timed out waiting for Tailwind');
            callback(); // Continue anyway
          }
        }
        check();
      }

      // Global error handler
      window.onerror = function(msg, url, line, col, error) {
        reportError('runtime', msg, 'Line ' + line + ': ' + (error ? error.stack : ''));
        return false;
      };
    <\/script>
  `;

  if (isReact) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        ${errorHandlingScript}
        <script src="${reactCDN[0]}" crossorigin onerror="handleCDNError('React', '${reactCDN[0]}', '${reactCDN[1]}')()"><\/script>
        <script src="${reactDomCDN[0]}" crossorigin onerror="handleCDNError('ReactDOM', '${reactDomCDN[0]}', '${reactDomCDN[1]}')()"><\/script>
        <script src="${babelCDN[0]}" onerror="handleCDNError('Babel', '${babelCDN[0]}', '${babelCDN[1]}')()"><\/script>
        <script src="${tailwindCDN[0]}" onload="window.__tailwindReady=true" onerror="handleCDNError('Tailwind', '${tailwindCDN[0]}', '${tailwindCDN[1] || ''}')()"><\/script>
        <link rel="stylesheet" href="${lucideCDN[0]}" onerror="this.onerror=null;this.href='${lucideCDN[1]}'">
        <style>
          body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
          * { box-sizing: border-box; }
          /* Hide content until Tailwind is ready to prevent FOUC */
          .tw-loading { opacity: 0; transition: opacity 0.2s; }
          .tw-ready { opacity: 1; }
        </style>
        ${designModeScript}
      </head>
      <body>
        <div id="root" class="tw-loading"></div>
        <script type="text/babel" data-presets="react">
          // Wait for Tailwind before rendering
          waitForTailwind(function() {
            try {
              ${code}

              const components = [
                typeof App !== 'undefined' ? App : null,
                typeof Component !== 'undefined' ? Component : null,
                typeof Main !== 'undefined' ? Main : null,
              ].filter(Boolean);

              if (components.length > 0) {
                const root = ReactDOM.createRoot(document.getElementById('root'));
                root.render(React.createElement(components[0]));
              }

              // Show content and report ready
              document.getElementById('root').classList.remove('tw-loading');
              document.getElementById('root').classList.add('tw-ready');
              reportReady();
            } catch (error) {
              document.getElementById('root').innerHTML = '<div style="color:red;padding:16px;background:#fee;border-radius:8px;"><strong>Error:</strong> ' + error.message + '</div>';
              document.getElementById('root').classList.remove('tw-loading');
              document.getElementById('root').classList.add('tw-ready');
              reportError('syntax', 'React render error', error.message);
            }
          });
        <\/script>
      </body>
      </html>
    `;
  }

  // Plain HTML
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      ${errorHandlingScript}
      <script src="${tailwindCDN[0]}" onload="window.__tailwindReady=true" onerror="handleCDNError('Tailwind', '${tailwindCDN[0]}', '${tailwindCDN[1] || ''}')()"><\/script>
      <style>
        body { margin: 0; font-family: system-ui, -apple-system, sans-serif; opacity: 0; transition: opacity 0.2s; }
        * { box-sizing: border-box; }
      </style>
      ${designModeScript}
    </head>
    <body>
      ${code}
      <script>
        waitForTailwind(function() {
          document.body.style.opacity = '1';
          reportReady();
        });
      <\/script>
    </body>
    </html>
  `;
}

export default DesignerPreview;
