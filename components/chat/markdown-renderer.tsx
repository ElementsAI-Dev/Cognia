'use client';

/**
 * MarkdownRenderer - Markdown renderer with support for Mermaid, LaTeX, VegaLite
 */

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';
import { MermaidBlock } from './renderers/mermaid-block';
import { VegaLiteBlock } from './renderers/vegalite-block';
import { CodeBlock } from './renderers/code-block';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  enableMermaid?: boolean;
  enableMath?: boolean;
  enableVegaLite?: boolean;
  showLineNumbers?: boolean;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
  enableMermaid = true,
  enableMath = true,
  enableVegaLite = true,
  showLineNumbers = true,
}: MarkdownRendererProps) {
  const remarkPlugins = useMemo(() => {
    const plugins: Parameters<typeof ReactMarkdown>[0]['remarkPlugins'] = [remarkGfm];
    if (enableMath) {
      plugins.push(remarkMath);
    }
    return plugins;
  }, [enableMath]);

  const rehypePlugins = useMemo(() => {
    const plugins: Parameters<typeof ReactMarkdown>[0]['rehypePlugins'] = [rehypeRaw];
    if (enableMath) {
      plugins.push(rehypeKatex);
    }
    return plugins;
  }, [enableMath]);

  return (
    <div className={cn('markdown-renderer prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          code({ className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const language = match ? match[1] : undefined;
            const codeContent = String(children).replace(/\n$/, '');
            const isInline = !match && !codeContent.includes('\n');

            if (isInline) {
              return (
                <code 
                  className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono" 
                  {...props}
                >
                  {children}
                </code>
              );
            }

            if (enableMermaid && language === 'mermaid') {
              return <MermaidBlock content={codeContent} />;
            }

            if (enableVegaLite && (language === 'vegalite' || language === 'vega-lite' || language === 'vega')) {
              return <VegaLiteBlock content={codeContent} />;
            }

            return (
              <CodeBlock 
                code={codeContent} 
                language={language} 
                showLineNumbers={showLineNumbers}
              />
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-border">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-border px-4 py-2">
                {children}
              </td>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-4">
                {children}
              </blockquote>
            );
          },
          ul({ children }) {
            return <ul className="list-disc pl-6 my-2 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-6 my-2 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          h1({ children }) {
            return <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>;
          },
          h4({ children }) {
            return <h4 className="text-base font-semibold mt-3 mb-2">{children}</h4>;
          },
          p({ children }) {
            return <p className="my-2 leading-relaxed">{children}</p>;
          },
          hr() {
            return <hr className="my-6 border-border" />;
          },
          img({ src, alt }) {
            return (
              <img
                src={src}
                alt={alt || ''}
                className="max-w-full h-auto rounded-lg my-4"
                loading="lazy"
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
