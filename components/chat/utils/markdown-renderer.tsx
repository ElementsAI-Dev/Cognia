'use client';

/**
 * MarkdownRenderer - Comprehensive Markdown renderer with support for:
 * - Mermaid diagrams
 * - LaTeX math (block and inline)
 * - VegaLite charts
 * - Syntax-highlighted code blocks
 * - Diff blocks
 * - Interactive code playgrounds (Sandpack)
 * - Enhanced images with lightbox
 * - Video/Audio embedding
 * - GitHub-style alerts
 * - Task lists
 * - Keyboard shortcuts
 * - And more...
 */

import { memo, useMemo, isValidElement, Children } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { cn } from '@/lib/utils';
import { MermaidBlock } from '../renderers/mermaid-block';
import { VegaLiteBlock } from '../renderers/vegalite-block';
import { CodeBlock } from '../renderers/code-block';
import { DiffBlock } from '../renderers/diff-block';
import { ImageBlock } from '../renderers/image-block';
import { VideoBlock } from '../renderers/video-block';
import { AudioBlock } from '../renderers/audio-block';
import { AlertBlock, parseAlertFromBlockquote } from '../renderers/alert-block';
import { DetailsBlock } from '../renderers/details-block';
import { TaskListItem as _TaskListItem } from '../renderers/task-list';
import { KbdInline } from '../renderers/kbd-inline';

// Re-export commonly used renderers for direct use
export { DataTable } from '../renderers/data-table';
export { SandpackBlock, SimplePlayground } from '../renderers/sandpack-block';
export { LinkCard, LinkGroup } from '../renderers/link-card';
export { FootnoteRef, FootnoteSection } from '../renderers/footnote-block';
export { EmojiBlock, shouldRenderAsEmoji } from '../renderers/emoji-block';
export { TaskList, TaskListItem } from '../renderers/task-list';
export { AlertBlock } from '../renderers/alert-block';
export type { AlertType } from '../renderers/alert-block';
export { ImageBlock } from '../renderers/image-block';
export { VideoBlock } from '../renderers/video-block';
export { AudioBlock } from '../renderers/audio-block';
export { DiffBlock } from '../renderers/diff-block';
export { DetailsBlock, DetailsGroup } from '../renderers/details-block';
export { KbdInline, KeyboardShortcut } from '../renderers/kbd-inline';

import 'katex/dist/katex.min.css';

/**
 * Custom sanitization schema for HTML in markdown
 * Extends default schema to allow additional safe elements and attributes
 * while blocking dangerous content like scripts, event handlers, and unsafe protocols
 */
const sanitizeSchema = {
  ...defaultSchema,
  // Allow additional safe HTML elements including KaTeX MathML
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'div', 'span', 'summary', 'details', 'figure', 'figcaption', 'sup', 'sub',
    // KaTeX MathML elements
    'math', 'annotation', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'ms', 'mtext',
    'mspace', 'msqrt', 'mroot', 'mfrac', 'msub', 'msup', 'msubsup', 'munder',
    'mover', 'munderover', 'mtable', 'mtr', 'mtd', 'menclose', 'maction',
    'mpadded', 'mphantom', 'mglyph', 'mlabeledtr', 'mmultiscripts', 'mprescripts',
    'none', 'maligngroup', 'malignmark',
  ],
  // Allow additional safe attributes
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    // Allow common styling attributes
    '*': [
      ...(defaultSchema.attributes?.['*'] ?? []),
      'className', 'class', 'style', 'aria-hidden',
    ],
    // Allow specific attributes for links
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      'className', 'class',
    ],
    // Allow specific attributes for images
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      'className', 'class', 'loading',
    ],
    // Allow table-specific attributes
    th: [
      ...(defaultSchema.attributes?.th ?? []),
      'className', 'class', 'rowSpan', 'colSpan',
    ],
    td: [
      ...(defaultSchema.attributes?.td ?? []),
      'className', 'class', 'rowSpan', 'colSpan',
    ],
    // KaTeX-specific attributes
    math: ['xmlns', 'display'],
    annotation: ['encoding'],
    mrow: ['displaystyle'],
    mtable: ['columnalign', 'columnspacing', 'rowspacing'],
    mtd: ['columnalign'],
  },
  // Explicitly forbid dangerous protocols (javascript:, data:, etc.)
  protocols: {
    ...defaultSchema.protocols,
    // Only allow safe protocols for href
    href: ['http', 'https', 'mailto'],
    // Only allow safe protocols for src
    src: ['http', 'https', 'data:image'],
  },
};

/**
 * Preprocess LaTeX delimiters to ensure compatibility with remark-math
 * Converts \[...\] to $$...$$ and \(...\) to $...$
 */
function preprocessLatex(content: string): string {
  // Convert \[...\] to $$...$$ (display math)
  let processed = content.replace(/\\\[([\s\S]*?)\\\]/g, (_match, eq) => `$$${eq}$$`);
  // Convert \(...\) to $...$ (inline math)
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_match, eq) => `$${eq}$`);
  return processed;
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  enableMermaid?: boolean;
  enableMath?: boolean;
  enableVegaLite?: boolean;
  enableDiff?: boolean;
  enableSandpack?: boolean;
  enableAlerts?: boolean;
  enableEnhancedImages?: boolean;
  enableVideoEmbed?: boolean;
  enableAudioEmbed?: boolean;
  enableTaskLists?: boolean;
  showLineNumbers?: boolean;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
  enableMermaid = true,
  enableMath = true,
  enableVegaLite = true,
  enableDiff = true,
  enableSandpack: _enableSandpack = false, // Disabled by default as it requires @codesandbox/sandpack-react
  enableAlerts = true,
  enableEnhancedImages = true,
  enableVideoEmbed = true,
  enableAudioEmbed = true,
  enableTaskLists: _enableTaskLists = true,
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
    const plugins: Parameters<typeof ReactMarkdown>[0]['rehypePlugins'] = [
      rehypeRaw,
    ];
    // IMPORTANT: rehypeKatex must run BEFORE rehypeSanitize
    // Otherwise, KaTeX-generated HTML elements will be stripped
    if (enableMath) {
      plugins.push([rehypeKatex, {
        throwOnError: false,
        strict: false,
        trust: true,
        output: 'htmlAndMathml',
      }]);
    }
    // Sanitize HTML last to prevent XSS while preserving KaTeX output
    plugins.push([rehypeSanitize, sanitizeSchema]);
    return plugins;
  }, [enableMath]);

  // Preprocess content to handle different LaTeX delimiter formats
  const processedContent = useMemo(() => {
    if (enableMath) {
      return preprocessLatex(content);
    }
    return content;
  }, [content, enableMath]);

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

            // Mermaid diagrams
            if (enableMermaid && language === 'mermaid') {
              return <MermaidBlock content={codeContent} />;
            }

            // VegaLite charts
            if (enableVegaLite && (language === 'vegalite' || language === 'vega-lite' || language === 'vega')) {
              return <VegaLiteBlock content={codeContent} />;
            }

            // Diff blocks
            if (enableDiff && language === 'diff') {
              return <DiffBlock content={codeContent} />;
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
            // Check for GitHub-style alerts: > [!NOTE], > [!TIP], etc.
            if (enableAlerts && children) {
              const textContent = extractTextContent(children);
              const alertInfo = parseAlertFromBlockquote(textContent);
              if (alertInfo) {
                return (
                  <AlertBlock type={alertInfo.type}>
                    {alertInfo.content}
                  </AlertBlock>
                );
              }
            }
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
            // NOTE: <li> is wrapped by parent <ul>/<ol> from react-markdown
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
          img({ src, alt, title }) {
            if (!src || typeof src !== 'string') return null;
            
            // Check if it's a video URL
            if (enableVideoEmbed && isVideoUrl(src)) {
              return <VideoBlock src={src} title={title || alt} />;
            }
            
            // Check if it's an audio URL
            if (enableAudioEmbed && isAudioUrl(src)) {
              return <AudioBlock src={src} title={title || alt} />;
            }
            
            // Enhanced image with lightbox
            if (enableEnhancedImages) {
              return <ImageBlock src={src} alt={alt || ''} title={title} />;
            }
            
            // Fallback to basic image
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt || ''}
                title={title}
                className="max-w-full h-auto rounded-lg my-4"
                loading="lazy"
              />
            );
          },
          // HTML details/summary elements
          details({ children }) {
            // Extract summary from children
            const childArray = Children.toArray(children);
            let summaryContent: React.ReactNode = 'Details';
            const restContent: React.ReactNode[] = [];
            
            childArray.forEach((child) => {
              if (isValidElement(child) && child.type === 'summary') {
                const props = child.props as { children?: React.ReactNode };
                summaryContent = props.children;
              } else {
                restContent.push(child);
              }
            });
            
            return (
              <DetailsBlock summary={summaryContent}>
                {restContent}
              </DetailsBlock>
            );
          },
          // Keyboard elements
          kbd({ children }) {
            return <KbdInline>{children}</KbdInline>;
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

/**
 * Extract text content from React children for alert detection
 */
function extractTextContent(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return children.map(extractTextContent).join('');
  }
  if (isValidElement(children)) {
    const props = children.props as { children?: React.ReactNode };
    return extractTextContent(props.children);
  }
  return '';
}

/**
 * Check if a URL points to a video file or video platform
 */
function isVideoUrl(url: string): boolean {
  const videoExtensions = /\.(mp4|webm|ogg|mov|avi|mkv)$/i;
  const videoPlatforms = /(youtube\.com|youtu\.be|vimeo\.com|bilibili\.com)/i;
  return videoExtensions.test(url) || videoPlatforms.test(url);
}

/**
 * Check if a URL points to an audio file
 */
function isAudioUrl(url: string): boolean {
  const audioExtensions = /\.(mp3|wav|ogg|aac|flac|m4a|wma)$/i;
  return audioExtensions.test(url);
}
