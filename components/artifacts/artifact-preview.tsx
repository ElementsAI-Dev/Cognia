'use client';

/**
 * ArtifactPreview - Live preview for HTML, React, SVG, Mermaid, Chart, Math, and Markdown
 */

import { useEffect, useRef, useState, Component } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { loggers } from '@/lib/logger';
import { renderHTML, renderSVG, getReactShellHtml, escapeHtml } from '@/lib/artifacts';
import type { Artifact, PreviewErrorBoundaryProps, PreviewErrorBoundaryState } from '@/types';
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

/**
 * Error boundary for artifact preview components
 */
class PreviewErrorBoundary extends Component<PreviewErrorBoundaryProps, PreviewErrorBoundaryState> {
  constructor(props: PreviewErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): PreviewErrorBoundaryState {
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

// renderHTML, renderSVG, getReactShellHtml, escapeHtml imported from @/lib/artifacts
