'use client';

/**
 * Skill Markdown Preview Component
 * 
 * Renders SKILL.md content with proper Markdown formatting and syntax highlighting
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface SkillMarkdownPreviewProps {
  content: string;
  className?: string;
}

/**
 * Simple Markdown to HTML converter for skill content
 * Handles common markdown patterns without external dependencies
 */
function parseMarkdown(content: string): string {
  let html = content;

  // Escape HTML to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks with language (```language\ncode\n```)
  html = html.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (_, lang, code) => {
      const langClass = lang ? ` data-language="${lang}"` : '';
      return `<pre class="code-block"${langClass}><code>${code.trim()}</code></pre>`;
    }
  );

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Headers (# to ######)
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Bold (**text** or __text__)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic (*text* or _text_)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Strikethrough (~~text~~)
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Horizontal rules (---, ***, ___)
  html = html.replace(/^[-*_]{3,}$/gm, '<hr />');

  // Unordered lists (- item or * item)
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // Ordered lists (1. item)
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // Blockquotes (> text)
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br/>');

  // Links [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Line breaks (two spaces at end of line or double newline)
  html = html.replace(/  \n/g, '<br/>');
  
  // Paragraphs (double newline)
  html = html.replace(/\n\n+/g, '</p><p>');
  
  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<')) {
    html = `<p>${html}</p>`;
  }

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>(<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<blockquote>)/g, '$1');
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
  html = html.replace(/<p>(<hr \/>)/g, '$1');

  return html;
}

export function SkillMarkdownPreview({ content, className }: SkillMarkdownPreviewProps) {
  const html = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div
      className={cn(
        'skill-markdown-preview prose prose-sm dark:prose-invert max-w-none',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        // Custom styles for skill markdown
      }}
    />
  );
}

/**
 * Styles for the markdown preview
 * These are injected as a style tag to ensure proper styling
 */
export function SkillMarkdownStyles() {
  return (
    <style jsx global>{`
      .skill-markdown-preview {
        font-size: 0.875rem;
        line-height: 1.6;
      }
      
      .skill-markdown-preview h1 {
        font-size: 1.5rem;
        font-weight: 700;
        margin-top: 1.5rem;
        margin-bottom: 0.75rem;
        padding-bottom: 0.25rem;
        border-bottom: 1px solid hsl(var(--border));
      }
      
      .skill-markdown-preview h2 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-top: 1.25rem;
        margin-bottom: 0.5rem;
      }
      
      .skill-markdown-preview h3 {
        font-size: 1.1rem;
        font-weight: 600;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
      }
      
      .skill-markdown-preview h4,
      .skill-markdown-preview h5,
      .skill-markdown-preview h6 {
        font-size: 1rem;
        font-weight: 600;
        margin-top: 0.75rem;
        margin-bottom: 0.25rem;
      }
      
      .skill-markdown-preview p {
        margin-bottom: 0.75rem;
      }
      
      .skill-markdown-preview ul,
      .skill-markdown-preview ol {
        margin-left: 1.25rem;
        margin-bottom: 0.75rem;
      }
      
      .skill-markdown-preview li {
        margin-bottom: 0.25rem;
      }
      
      .skill-markdown-preview .code-block {
        background: hsl(var(--muted));
        border-radius: 0.375rem;
        padding: 0.75rem 1rem;
        margin: 0.75rem 0;
        overflow-x: auto;
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace;
        font-size: 0.8125rem;
        line-height: 1.5;
      }
      
      .skill-markdown-preview .code-block code {
        background: transparent;
        padding: 0;
        border-radius: 0;
      }
      
      .skill-markdown-preview .inline-code {
        background: hsl(var(--muted));
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace;
        font-size: 0.8125rem;
      }
      
      .skill-markdown-preview blockquote {
        border-left: 3px solid hsl(var(--primary));
        padding-left: 1rem;
        margin: 0.75rem 0;
        color: hsl(var(--muted-foreground));
        font-style: italic;
      }
      
      .skill-markdown-preview hr {
        border: none;
        border-top: 1px solid hsl(var(--border));
        margin: 1rem 0;
      }
      
      .skill-markdown-preview a {
        color: hsl(var(--primary));
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      
      .skill-markdown-preview a:hover {
        opacity: 0.8;
      }
      
      .skill-markdown-preview strong {
        font-weight: 600;
      }
      
      .skill-markdown-preview em {
        font-style: italic;
      }
    `}</style>
  );
}

export default SkillMarkdownPreview;
