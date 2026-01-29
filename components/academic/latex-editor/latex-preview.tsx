'use client';

/**
 * LaTeX Preview Component
 * Renders LaTeX content using KaTeX
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import katex from 'katex';

interface LaTeXPreviewProps {
  content: string;
  scale?: number;
  className?: string;
}

export function LaTeXPreview({ content, scale = 1, className }: LaTeXPreviewProps) {
  const renderedContent = useMemo(() => {
    if (!content) return '';

    let html = content;

    // Render display math: $$...$$ or \[...\]
    html = html.replace(/\$\$([^$]+)\$\$/g, (_, math) => {
      try {
        return katex.renderToString(math, { displayMode: true, throwOnError: false });
      } catch {
        return `<span class="text-red-500">[Math Error: ${math}]</span>`;
      }
    });

    html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
      try {
        return katex.renderToString(math, { displayMode: true, throwOnError: false });
      } catch {
        return `<span class="text-red-500">[Math Error: ${math}]</span>`;
      }
    });

    // Render inline math: $...$
    html = html.replace(/\$([^$]+)\$/g, (_, math) => {
      try {
        return katex.renderToString(math, { displayMode: false, throwOnError: false });
      } catch {
        return `<span class="text-red-500">[Math Error: ${math}]</span>`;
      }
    });

    // Convert LaTeX commands to HTML
    html = html.replace(/\\section\{([^}]+)\}/g, '<h2 class="text-2xl font-bold mt-6 mb-3">$1</h2>');
    html = html.replace(/\\subsection\{([^}]+)\}/g, '<h3 class="text-xl font-semibold mt-4 mb-2">$1</h3>');
    html = html.replace(/\\subsubsection\{([^}]+)\}/g, '<h4 class="text-lg font-medium mt-3 mb-2">$1</h4>');

    html = html.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
    html = html.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>');
    html = html.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>');
    html = html.replace(/\\underline\{([^}]+)\}/g, '<u>$1</u>');
    html = html.replace(/\\texttt\{([^}]+)\}/g, '<code class="font-mono bg-muted px-1 rounded">$1</code>');

    // Lists
    html = html.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, items) => {
      const listItems = items.replace(/\\item\s*/g, '</li><li>').slice(5);
      return `<ul class="list-disc pl-6 my-2"><li>${listItems}</li></ul>`;
    });

    html = html.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, items) => {
      const listItems = items.replace(/\\item\s*/g, '</li><li>').slice(5);
      return `<ol class="list-decimal pl-6 my-2"><li>${listItems}</li></ol>`;
    });

    // Remove document structure
    html = html.replace(/\\documentclass.*?\n/g, '');
    html = html.replace(/\\usepackage.*?\n/g, '');
    html = html.replace(/\\begin\{document\}/g, '');
    html = html.replace(/\\end\{document\}/g, '');
    html = html.replace(/\\maketitle/g, '');
    html = html.replace(/\\title\{([^}]+)\}/g, '<h1 class="text-3xl font-bold mb-4">$1</h1>');
    html = html.replace(/\\author\{([^}]+)\}/g, '<p class="text-muted-foreground mb-2">$1</p>');
    html = html.replace(/\\date\{([^}]+)\}/g, '<p class="text-muted-foreground mb-4">$1</p>');

    // Paragraphs
    html = html.replace(/\n\n+/g, '</p><p class="my-3">');

    // Line breaks
    html = html.replace(/\\\\/g, '<br>');

    return `<p class="my-3">${html}</p>`;
  }, [content]);

  return (
    <div
      className={cn('latex-preview prose dark:prose-invert max-w-none', className)}
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}

export default LaTeXPreview;
