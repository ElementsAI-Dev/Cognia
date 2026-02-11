'use client';

/**
 * ArtifactPreview - Live preview for HTML, React, SVG, Mermaid, Chart, Math, and Markdown
 */

import { useEffect, useRef, useState, Component, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import DOMPurify from 'dompurify';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { loggers } from '@/lib/logger';
import type { Artifact } from '@/types';
import {
  MermaidRenderer,
  ChartRenderer,
  MathRenderer,
  MarkdownRenderer,
} from './artifact-renderers';
import { JupyterRenderer } from './jupyter-renderer';

interface ArtifactPreviewProps {
  artifact: Artifact;
  className?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  errorMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for artifact preview components
 */
class PreviewErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    loggers.ui.error('Artifact preview error', { error: error.message, stack: errorInfo.componentStack });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <Alert variant="destructive" className="m-4" role="alert" aria-live="assertive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{this.props.errorMessage || 'Preview failed to render'}</p>
                {this.state.error?.message && (
                  <p className="text-xs mt-1 opacity-80">{this.state.error.message}</p>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={this.handleRetry} aria-label="Retry preview">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }
    return this.props.children;
  }
}

/**
 * Loading spinner component
 */
function PreviewLoading({
  message,
  defaultMessage,
}: {
  message?: string;
  defaultMessage?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm">{message || defaultMessage || 'Loading preview...'}</p>
    </div>
  );
}

export function ArtifactPreview({ artifact, className }: ArtifactPreviewProps) {
  const t = useTranslations('artifactPreview');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  // Check if this type needs iframe rendering
  const needsIframe = ['html', 'svg', 'react'].includes(artifact.type);
  const [isLoading, setIsLoading] = useState(needsIframe);

  useEffect(() => {
    if (!needsIframe) return;

    const rafId = requestAnimationFrame(() => {
      setError(null);
      setIsLoading(true);
    });

    const doRenderPreview = () => {
      if (!iframeRef.current) return;

      const iframe = iframeRef.current;

      try {
        switch (artifact.type) {
          case 'html': {
            const doc = iframe.contentDocument;
            if (!doc) return;
            renderHTML(doc, artifact.content);
            break;
          }
          case 'svg': {
            const doc = iframe.contentDocument;
            if (!doc) return;
            renderSVG(doc, artifact.content);
            break;
          }
          case 'react':
            // React uses srcdoc + postMessage for security
            iframe.srcdoc = getReactShellHtml();
            // Send content after iframe loads the shell
            iframe.onload = () => {
              iframe.contentWindow?.postMessage(
                { type: 'render-component', code: artifact.content },
                '*'
              );
            };
            break;
          default: {
            const doc = iframe.contentDocument;
            if (doc) {
              doc.body.innerHTML = `<pre>${escapeHtml(artifact.content)}</pre>`;
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('previewError'));
      }
    };

    // Small delay to ensure iframe is ready
    const timer = setTimeout(() => {
      doRenderPreview();
      setIsLoading(false);
    }, 100);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [artifact.content, artifact.type, key, needsIframe, t]);

  // Listen for error messages from React preview iframe via postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === 'artifact-preview-error') {
        setError(event.data.message || t('previewError'));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [t]);

  const handleRefresh = () => {
    setKey((k) => k + 1);
  };

  // Render specialized components for non-iframe types
  if (artifact.type === 'mermaid') {
    return (
      <PreviewErrorBoundary errorMessage={t('previewFailed')}>
        <div className={cn('h-full w-full overflow-auto bg-background', className)}>
          <MermaidRenderer content={artifact.content} className="min-h-full" />
        </div>
      </PreviewErrorBoundary>
    );
  }

  if (artifact.type === 'chart') {
    return (
      <PreviewErrorBoundary errorMessage={t('previewFailed')}>
        <div className={cn('h-full w-full overflow-auto bg-background p-4', className)}>
          <ChartRenderer
            content={artifact.content}
            chartType={artifact.metadata?.chartType}
            className="min-h-[300px]"
          />
        </div>
      </PreviewErrorBoundary>
    );
  }

  if (artifact.type === 'math') {
    return (
      <PreviewErrorBoundary errorMessage={t('previewFailed')}>
        <div className={cn('h-full w-full overflow-auto bg-background', className)}>
          <MathRenderer content={artifact.content} className="min-h-full" />
        </div>
      </PreviewErrorBoundary>
    );
  }

  if (artifact.type === 'jupyter') {
    return (
      <PreviewErrorBoundary errorMessage={t('previewFailed')}>
        <div className={cn('h-full w-full overflow-hidden bg-background', className)}>
          <JupyterRenderer content={artifact.content} className="h-full" />
        </div>
      </PreviewErrorBoundary>
    );
  }

  if (artifact.type === 'document') {
    return (
      <PreviewErrorBoundary errorMessage={t('previewFailed')}>
        <div className={cn('h-full w-full overflow-auto bg-background', className)}>
          <MarkdownRenderer content={artifact.content} className="min-h-full" />
        </div>
      </PreviewErrorBoundary>
    );
  }

  // Default: iframe-based rendering for HTML, SVG, React
  return (
    <div className={cn('relative h-full w-full', className)} role="region" aria-label={t('previewTitle', { title: artifact.title })}>
      {isLoading && (
        <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm">
          <PreviewLoading message={t('loadingPreview')} defaultMessage={t('loadingPreview')} />
        </div>
      )}
      {error && (
        <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-destructive text-sm" role="alert" aria-live="assertive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button size="sm" variant="ghost" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}
      <iframe
        ref={iframeRef}
        key={key}
        className="h-full w-full border-0 bg-white"
        sandbox="allow-scripts"
        title={t('previewTitle', { title: artifact.title })}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setError(t('iframeLoadError'));
        }}
      />
    </div>
  );
}

function renderHTML(doc: Document, content: string) {
  const sanitized = DOMPurify.sanitize(content, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ['style', 'link', 'meta'],
    ADD_ATTR: ['target', 'rel', 'class', 'id', 'style'],
    ALLOW_DATA_ATTR: true,
  });
  doc.open();
  doc.write(sanitized);
  doc.close();
}

function renderSVG(doc: Document, content: string) {
  const sanitized = DOMPurify.sanitize(content, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['style'],
  });
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; }
        svg { max-width: 100%; max-height: 100vh; }
      </style>
    </head>
    <body>${sanitized}</body>
    </html>
  `);
  doc.close();
}

/**
 * Generate a static HTML shell for React preview.
 * Content is received via postMessage to prevent XSS via template string injection.
 * Uses React 19 CDN and CSP meta tag to restrict external requests.
 */
function getReactShellHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com; style-src 'unsafe-inline' https://cdn.tailwindcss.com; img-src data: blob:; font-src data:;">
  <script src="https://unpkg.com/react@19/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@19/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    // CDN load check with timeout
    var _cdnTimeout = setTimeout(function() {
      if (typeof React === 'undefined' || typeof ReactDOM === 'undefined' || typeof Babel === 'undefined') {
        document.getElementById('root').innerHTML =
          '<div style="color: #b45309; padding: 16px; background: #fef3c7; border-radius: 8px;">' +
          '<strong>CDN Loading Failed</strong><p style="margin:8px 0 0">Unable to load React dependencies from CDN. Check your network connection.</p></div>';
      }
    }, 15000);

    // Receive component code via postMessage (secure: no template injection)
    window.addEventListener('message', function(event) {
      if (!event.data || event.data.type !== 'render-component') return;
      clearTimeout(_cdnTimeout);
      var code = event.data.code;
      try {
        // Create a script element with Babel transpilation
        var scriptEl = document.createElement('script');
        scriptEl.setAttribute('type', 'text/babel');
        scriptEl.setAttribute('data-presets', 'react');
        scriptEl.textContent = code + '\\n' +
          ';(function() {' +
          '  var components = [' +
          '    typeof App !== "undefined" ? App : null,' +
          '    typeof Component !== "undefined" ? Component : null,' +
          '    typeof Main !== "undefined" ? Main : null,' +
          '  ].filter(Boolean);' +
          '  if (components.length > 0) {' +
          '    var root = ReactDOM.createRoot(document.getElementById("root"));' +
          '    root.render(React.createElement(components[0]));' +
          '  } else {' +
          '    document.getElementById("root").innerHTML = "<p style=\\"color: #666;\\">No component found. Export an App, Component, or Main function.</p>";' +
          '  }' +
          '})();';
        document.body.appendChild(scriptEl);
        // Trigger Babel to process the new script
        if (typeof Babel !== 'undefined' && Babel.transformScriptTags) {
          Babel.transformScriptTags();
        }
      } catch (error) {
        document.getElementById('root').innerHTML = '<div style="color: red; padding: 16px; background: #fee; border-radius: 8px;"><strong>Error:</strong> ' + error.message + '</div>';
        window.parent.postMessage({ type: 'artifact-preview-error', message: error.message }, '*');
      }
    });
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
