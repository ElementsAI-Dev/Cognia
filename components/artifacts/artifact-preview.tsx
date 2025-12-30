'use client';

/**
 * ArtifactPreview - Live preview for HTML, React, SVG, Mermaid, Chart, Math, and Markdown
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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

export function ArtifactPreview({ artifact, className }: ArtifactPreviewProps) {
  const t = useTranslations('artifactPreview');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  // Check if this type needs iframe rendering
  const needsIframe = ['html', 'svg', 'react'].includes(artifact.type);

  useEffect(() => {
    if (!needsIframe) return;
    
    setError(null);
    doRenderPreview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifact.content, artifact.type, key, needsIframe]);

  const doRenderPreview = () => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    if (!doc) return;

    try {
      switch (artifact.type) {
        case 'html':
          renderHTML(doc, artifact.content);
          break;
        case 'svg':
          renderSVG(doc, artifact.content);
          break;
        case 'react':
          renderReact(doc, artifact.content);
          break;
        default:
          doc.body.innerHTML = `<pre>${escapeHtml(artifact.content)}</pre>`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('previewError'));
    }
  };

  const handleRefresh = () => {
    setKey((k) => k + 1);
  };

  // Render specialized components for non-iframe types
  if (artifact.type === 'mermaid') {
    return (
      <div className={cn('h-full w-full overflow-auto bg-background', className)}>
        <MermaidRenderer content={artifact.content} className="min-h-full" />
      </div>
    );
  }

  if (artifact.type === 'chart') {
    return (
      <div className={cn('h-full w-full overflow-auto bg-background p-4', className)}>
        <ChartRenderer
          content={artifact.content}
          chartType={artifact.metadata?.chartType}
          className="min-h-[300px]"
        />
      </div>
    );
  }

  if (artifact.type === 'math') {
    return (
      <div className={cn('h-full w-full overflow-auto bg-background', className)}>
        <MathRenderer content={artifact.content} className="min-h-full" />
      </div>
    );
  }

  if (artifact.type === 'jupyter') {
    return (
      <div className={cn('h-full w-full overflow-hidden bg-background', className)}>
        <JupyterRenderer content={artifact.content} className="h-full" />
      </div>
    );
  }

  if (artifact.type === 'document') {
    return (
      <div className={cn('h-full w-full overflow-auto bg-background', className)}>
        <MarkdownRenderer content={artifact.content} className="min-h-full" />
      </div>
    );
  }

  // Default: iframe-based rendering for HTML, SVG, React
  return (
    <div className={cn('relative h-full w-full', className)}>
      {error && (
        <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
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
        sandbox="allow-scripts allow-same-origin"
        title={t('previewTitle', { title: artifact.title })}
      />
    </div>
  );
}

function renderHTML(doc: Document, content: string) {
  doc.open();
  doc.write(content);
  doc.close();
}

function renderSVG(doc: Document, content: string) {
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
    <body>${content}</body>
    </html>
  `);
  doc.close();
}

function renderReact(doc: Document, content: string) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; }
        * { box-sizing: border-box; }
      </style>
    </head>
    <body>
      <div id="root"></div>
      <script type="text/babel" data-presets="react">
        try {
          ${content}

          // Try to find and render the main component
          const components = [
            typeof App !== 'undefined' ? App : null,
            typeof Component !== 'undefined' ? Component : null,
            typeof Main !== 'undefined' ? Main : null,
            typeof default !== 'undefined' ? default : null,
          ].filter(Boolean);

          if (components.length > 0) {
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(React.createElement(components[0]));
          } else {
            document.getElementById('root').innerHTML = '<p style="color: #666;">No component found. Export an App, Component, or Main function.</p>';
          }
        } catch (error) {
          document.getElementById('root').innerHTML = '<div style="color: red; padding: 16px; background: #fee; border-radius: 8px;"><strong>Error:</strong> ' + error.message + '</div>';
          console.error(error);
        }
      </script>
    </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default ArtifactPreview;
