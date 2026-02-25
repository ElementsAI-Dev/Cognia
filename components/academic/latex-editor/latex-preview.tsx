'use client';

/**
 * LaTeX Preview Component
 * Renders LaTeX content using KaTeX with enhanced environment support
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { renderMathCached } from '@/lib/latex/cache';

interface LaTeXPreviewProps {
  content: string;
  scale?: number;
  className?: string;
  showLineNumbers?: boolean;
}

/**
 * Counter state for numbered environments
 * Using a class-based approach to avoid global mutable state
 */
interface EnvironmentCounters {
  theorem: number;
  lemma: number;
  definition: number;
  corollary: number;
  proposition: number;
  example: number;
  equation: number;
}

function createCounters(): EnvironmentCounters {
  return {
    theorem: 0,
    lemma: 0,
    definition: 0,
    corollary: 0,
    proposition: 0,
    example: 0,
    equation: 0,
  };
}

/**
 * Safely render math with caching, returning HTML or error message
 */
function safeRenderMath(latex: string, displayMode: boolean): string {
  try {
    return renderMathCached(latex, displayMode);
  } catch {
    return `<span class="text-red-500">[Math Error: ${latex}]</span>`;
  }
}

/**
 * Match braced content handling nested braces correctly.
 * Given a string starting at the opening `{`, returns the content between matching braces.
 * Returns null if no matching brace is found.
 */
function matchBracedContent(str: string, startIndex: number): { content: string; endIndex: number } | null {
  if (str[startIndex] !== '{') return null;
  let depth = 0;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') depth--;
    if (depth === 0) {
      return { content: str.slice(startIndex + 1, i), endIndex: i };
    }
  }
  return null;
}

/**
 * Replace a LaTeX command with one braced argument, handling nested braces.
 * e.g. \textbf{bold \textit{italic} text} → <strong>bold \textit{italic} text</strong>
 */
function replaceCommand(html: string, command: string, wrapper: (content: string) => string): string {
  const pattern = `\\${command}{`;
  let result = html;
  let searchFrom = 0;

  while (true) {
    const idx = result.indexOf(pattern, searchFrom);
    if (idx === -1) break;

    const braceStart = idx + pattern.length - 1; // index of '{'
    const matched = matchBracedContent(result, braceStart);
    if (!matched) {
      searchFrom = idx + 1;
      continue;
    }

    const before = result.slice(0, idx);
    const after = result.slice(matched.endIndex + 1);
    const replacement = wrapper(matched.content);
    result = before + replacement + after;
    searchFrom = before.length + replacement.length;
  }

  return result;
}

export function LaTeXPreview({ content, scale = 1, className, showLineNumbers: _showLineNumbers = false }: LaTeXPreviewProps) {
  const renderedContent = useMemo(() => {
    if (!content) return '';

    // Create local counters for this render pass
    const counters = createCounters();

    let html = content;

    // ========================================================================
    // Extract verbatim/lstlisting FIRST to protect their content from all transforms
    // ========================================================================
    const verbatimBlocks: string[] = [];
    const VERBATIM_TOKEN = '\x00VBT_';

    html = html.replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, (_, code) => {
      const idx = verbatimBlocks.length;
      verbatimBlocks.push(
        `<pre class="my-4 p-4 bg-muted rounded-md overflow-x-auto"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
      );
      return `${VERBATIM_TOKEN}${idx}\x00`;
    });
    html = html.replace(/\\begin\{lstlisting\}(?:\[([^\]]*)\])?([\s\S]*?)\\end\{lstlisting\}/g, (_, _opts, code) => {
      const idx = verbatimBlocks.length;
      verbatimBlocks.push(
        `<pre class="my-4 p-4 bg-muted rounded-md overflow-x-auto"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
      );
      return `${VERBATIM_TOKEN}${idx}\x00`;
    });

    // Render display math: $$...$$ or \[...\]
    html = html.replace(/\$\$([^$]+)\$\$/g, (_, math) => {
      return `<div class="my-4 overflow-x-auto">${safeRenderMath(math, true)}</div>`;
    });

    html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
      return `<div class="my-4 overflow-x-auto">${safeRenderMath(math, true)}</div>`;
    });

    // Render inline math: $...$
    html = html.replace(/\$([^$]+)\$/g, (_, math) => {
      return safeRenderMath(math, false);
    });

    // Theorem-like environments
    html = html.replace(/\\begin\{theorem\}(?:\[([^\]]*)\])?([\s\S]*?)\\end\{theorem\}/g, (_, title, envContent) => {
      counters.theorem++;
      const titleText = title ? ` (${title})` : '';
      return `<div class="my-4 p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30 rounded-r">
        <p class="font-bold text-blue-700 dark:text-blue-300 mb-2">Theorem ${counters.theorem}${titleText}</p>
        <div class="italic">${envContent.trim()}</div>
      </div>`;
    });

    html = html.replace(/\\begin\{lemma\}(?:\[([^\]]*)\])?([\s\S]*?)\\end\{lemma\}/g, (_, title, envContent) => {
      counters.lemma++;
      const titleText = title ? ` (${title})` : '';
      return `<div class="my-4 p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950/30 rounded-r">
        <p class="font-bold text-green-700 dark:text-green-300 mb-2">Lemma ${counters.lemma}${titleText}</p>
        <div class="italic">${envContent.trim()}</div>
      </div>`;
    });

    html = html.replace(/\\begin\{definition\}(?:\[([^\]]*)\])?([\s\S]*?)\\end\{definition\}/g, (_, title, envContent) => {
      counters.definition++;
      const titleText = title ? ` (${title})` : '';
      return `<div class="my-4 p-4 border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-950/30 rounded-r">
        <p class="font-bold text-purple-700 dark:text-purple-300 mb-2">Definition ${counters.definition}${titleText}</p>
        <div>${envContent.trim()}</div>
      </div>`;
    });

    html = html.replace(/\\begin\{corollary\}(?:\[([^\]]*)\])?([\s\S]*?)\\end\{corollary\}/g, (_, title, envContent) => {
      counters.corollary++;
      const titleText = title ? ` (${title})` : '';
      return `<div class="my-4 p-4 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950/30 rounded-r">
        <p class="font-bold text-orange-700 dark:text-orange-300 mb-2">Corollary ${counters.corollary}${titleText}</p>
        <div class="italic">${envContent.trim()}</div>
      </div>`;
    });

    html = html.replace(/\\begin\{proposition\}(?:\[([^\]]*)\])?([\s\S]*?)\\end\{proposition\}/g, (_, title, envContent) => {
      counters.proposition++;
      const titleText = title ? ` (${title})` : '';
      return `<div class="my-4 p-4 border-l-4 border-teal-500 bg-teal-50 dark:bg-teal-950/30 rounded-r">
        <p class="font-bold text-teal-700 dark:text-teal-300 mb-2">Proposition ${counters.proposition}${titleText}</p>
        <div class="italic">${envContent.trim()}</div>
      </div>`;
    });

    html = html.replace(/\\begin\{example\}(?:\[([^\]]*)\])?([\s\S]*?)\\end\{example\}/g, (_, title, envContent) => {
      counters.example++;
      const titleText = title ? ` (${title})` : '';
      return `<div class="my-4 p-4 border-l-4 border-gray-400 bg-gray-50 dark:bg-gray-800/30 rounded-r">
        <p class="font-bold text-gray-700 dark:text-gray-300 mb-2">Example ${counters.example}${titleText}</p>
        <div>${envContent.trim()}</div>
      </div>`;
    });

    // Proof environment
    html = html.replace(/\\begin\{proof\}(?:\[([^\]]*)\])?([\s\S]*?)\\end\{proof\}/g, (_, title, content) => {
      const titleText = title || 'Proof';
      return `<div class="my-4 p-4 border border-gray-200 dark:border-gray-700 rounded bg-gray-50/50 dark:bg-gray-800/30">
        <p class="font-semibold mb-2">${titleText}.</p>
        <div>${content.trim()}</div>
        <div class="text-right mt-2">□</div>
      </div>`;
    });

    // Remark and Note environments
    html = html.replace(/\\begin\{remark\}([\s\S]*?)\\end\{remark\}/g, (_, content) => {
      return `<div class="my-4 p-4 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 rounded-r">
        <p class="font-bold text-yellow-700 dark:text-yellow-300 mb-2">Remark</p>
        <div>${content.trim()}</div>
      </div>`;
    });

    html = html.replace(/\\begin\{note\}([\s\S]*?)\\end\{note\}/g, (_, content) => {
      return `<div class="my-4 p-4 border-l-4 border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30 rounded-r">
        <p class="font-bold text-cyan-700 dark:text-cyan-300 mb-2">Note</p>
        <div>${content.trim()}</div>
      </div>`;
    });

    // Quote/quotation environment
    html = html.replace(/\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g, (_, content) => {
      return `<blockquote class="my-4 pl-4 border-l-4 border-gray-300 dark:border-gray-600 italic text-gray-600 dark:text-gray-400">${content.trim()}</blockquote>`;
    });

    html = html.replace(/\\begin\{quotation\}([\s\S]*?)\\end\{quotation\}/g, (_, content) => {
      return `<blockquote class="my-4 pl-4 border-l-4 border-gray-300 dark:border-gray-600 italic text-gray-600 dark:text-gray-400">${content.trim()}</blockquote>`;
    });

    // Abstract environment
    html = html.replace(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/g, (_, content) => {
      return `<div class="my-6 mx-8">
        <p class="font-bold text-center mb-2">Abstract</p>
        <div class="text-sm text-justify">${content.trim()}</div>
      </div>`;
    });

    // Equation environment with numbering
    html = html.replace(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, (_, math) => {
      counters.equation++;
      return `<div class="my-4 flex items-center justify-center gap-4">
        <div class="flex-1 overflow-x-auto text-center">${safeRenderMath(math.trim(), true)}</div>
        <span class="text-muted-foreground text-sm">(${counters.equation})</span>
      </div>`;
    });

    // Align environment - preserve & as alignment marker for KaTeX
    html = html.replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, (_, math) => {
      // KaTeX's aligned environment supports & as alignment markers
      return `<div class="my-4 overflow-x-auto">${safeRenderMath(`\\begin{aligned}${math}\\end{aligned}`, true)}</div>`;
    });

    // Gather environment - centered multi-line equations
    html = html.replace(/\\begin\{gather\*?\}([\s\S]*?)\\end\{gather\*?\}/g, (_, math) => {
      return `<div class="my-4 overflow-x-auto">${safeRenderMath(`\\begin{gathered}${math}\\end{gathered}`, true)}</div>`;
    });

    // Multline environment - long equation split across lines
    html = html.replace(/\\begin\{multline\*?\}([\s\S]*?)\\end\{multline\*?\}/g, (_, math) => {
      // Use gathered as KaTeX doesn't have multline, apply similar styling
      return `<div class="my-4 overflow-x-auto">${safeRenderMath(`\\begin{gathered}${math}\\end{gathered}`, true)}</div>`;
    });

    // Cases environment - piecewise functions (KaTeX native support)
    html = html.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_, math) => {
      return `<div class="my-4 overflow-x-auto">${safeRenderMath(`\\begin{cases}${math}\\end{cases}`, true)}</div>`;
    });

    // Convert LaTeX commands to HTML — using replaceCommand for nested brace support
    html = replaceCommand(html, 'section', (c) => `<h2 class="text-2xl font-bold mt-6 mb-3">${c}</h2>`);
    html = replaceCommand(html, 'subsection', (c) => `<h3 class="text-xl font-semibold mt-4 mb-2">${c}</h3>`);
    html = replaceCommand(html, 'subsubsection', (c) => `<h4 class="text-lg font-medium mt-3 mb-2">${c}</h4>`);

    html = replaceCommand(html, 'textbf', (c) => `<strong>${c}</strong>`);
    html = replaceCommand(html, 'textit', (c) => `<em>${c}</em>`);
    html = replaceCommand(html, 'emph', (c) => `<em>${c}</em>`);
    html = replaceCommand(html, 'underline', (c) => `<u>${c}</u>`);
    html = replaceCommand(html, 'texttt', (c) => `<code class="font-mono bg-muted px-1 rounded">${c}</code>`);
    html = replaceCommand(html, 'textsc', (c) => `<span class="uppercase text-sm tracking-wide">${c}</span>`);

    // Color support — handled with nested braces
    html = html.replace(/\\textcolor\{([^}]+)\}\{([^}]+)\}/g, '<span style="color: $1">$2</span>');
    html = html.replace(/\\colorbox\{([^}]+)\}\{([^}]+)\}/g, '<span style="background-color: $1; padding: 2px 4px;">$2</span>');

    // Lists
    html = html.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, items) => {
      const listItems = items.replace(/\\item\s*/g, '</li><li>').slice(5);
      return `<ul class="list-disc pl-6 my-2"><li>${listItems}</li></ul>`;
    });

    html = html.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, items) => {
      const listItems = items.replace(/\\item\s*/g, '</li><li>').slice(5);
      return `<ol class="list-decimal pl-6 my-2"><li>${listItems}</li></ol>`;
    });

    html = html.replace(/\\begin\{description\}([\s\S]*?)\\end\{description\}/g, (_, items) => {
      const processed = items.replace(/\\item\[([^\]]+)\]\s*/g, '</dd><dt class="font-bold">$1</dt><dd>').slice(5);
      return `<dl class="my-2">${processed}</dd></dl>`;
    });

    // Tabular environment - basic table support
    html = html.replace(/\\begin\{tabular\}\{([^}]+)\}([\s\S]*?)\\end\{tabular\}/g, (_, colSpec, content) => {
      // Parse column specification to determine alignment
      const cols = colSpec.replace(/\|/g, '').split('');
      const alignMap: Record<string, string> = { l: 'left', c: 'center', r: 'right' };
      
      // Process rows
      const rows = content.trim().split('\\\\').filter((row: string) => row.trim() && !row.trim().startsWith('\\hline'));
      const tableRows = rows.map((row: string) => {
        const cells = row.split('&').map((cell: string, idx: number) => {
          const align = alignMap[cols[idx]] || 'left';
          return `<td class="border border-border px-3 py-2 text-${align}">${cell.trim()}</td>`;
        });
        return `<tr>${cells.join('')}</tr>`;
      }).join('');
      
      return `<div class="my-4 overflow-x-auto">
        <table class="min-w-full border-collapse border border-border">
          <tbody>${tableRows}</tbody>
        </table>
      </div>`;
    });

    // Includegraphics command - render as image (must be processed BEFORE figure/table environments)
    html = html.replace(/\\includegraphics(?:\[([^\]]*)\])?\{([^}]+)\}/g, (_, options, src) => {
      // Parse options for width/height
      let style = 'max-width: 100%; height: auto;';
      if (options) {
        const widthMatch = options.match(/width=([^,\]]+)/);
        const heightMatch = options.match(/height=([^,\]]+)/);
        const scaleMatch = options.match(/scale=([^,\]]+)/);
        
        if (widthMatch) {
          const width = widthMatch[1].replace('\\textwidth', '100%').replace('\\linewidth', '100%');
          style = `width: ${width}; height: auto;`;
        }
        if (heightMatch) {
          style += ` height: ${heightMatch[1]};`;
        }
        if (scaleMatch) {
          const scale = parseFloat(scaleMatch[1]) * 100;
          style = `width: ${scale}%; height: auto;`;
        }
      }
      
      // Check if src is a URL or placeholder
      const isUrl = src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:');
      if (isUrl) {
        return `<img src="${src}" alt="Figure" style="${style}" class="rounded-lg" loading="lazy" />`;
      }
      // For non-URL paths, show placeholder
      return `<div class="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center text-muted-foreground" style="${style}">
        <p class="text-sm">[Image: ${src}]</p>
      </div>`;
    });

    // Table environment with caption (processed AFTER includegraphics)
    html = html.replace(/\\begin\{table\}(?:\[([^\]]*)\])?([\s\S]*?)\\end\{table\}/g, (_, _position, content) => {
      // Extract caption if present
      const captionMatch = content.match(/\\caption\{([^}]+)\}/);
      const caption = captionMatch ? captionMatch[1] : '';
      // Remove caption from content for further processing
      const tableContent = content.replace(/\\caption\{[^}]+\}/g, '').replace(/\\centering/g, '').trim();
      
      return `<figure class="my-6">
        <div class="overflow-x-auto">${tableContent}</div>
        ${caption ? `<figcaption class="text-center text-sm text-muted-foreground mt-2">Table: ${caption}</figcaption>` : ''}
      </figure>`;
    });

    // Figure environment with caption (processed AFTER includegraphics)
    html = html.replace(/\\begin\{figure\}(?:\[([^\]]*)\])?([\s\S]*?)\\end\{figure\}/g, (_, _position, content) => {
      // Extract caption if present
      const captionMatch = content.match(/\\caption\{([^}]+)\}/);
      const caption = captionMatch ? captionMatch[1] : '';
      // Remove caption and centering from content
      const figureContent = content.replace(/\\caption\{[^}]+\}/g, '').replace(/\\centering/g, '').trim();
      
      return `<figure class="my-6 text-center">
        <div class="inline-block">${figureContent}</div>
        ${caption ? `<figcaption class="text-center text-sm text-muted-foreground mt-2">Figure: ${caption}</figcaption>` : ''}
      </figure>`;
    });

    // Hyperlinks — sanitize URLs to prevent javascript: XSS
    html = html.replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, (_, url, text) => {
      const safeUrl = /^(https?:|mailto:|ftp:)/i.test(url.trim()) ? url : '#';
      return `<a href="${safeUrl}" class="text-blue-500 underline hover:text-blue-700" target="_blank" rel="noopener">${text}</a>`;
    });
    html = html.replace(/\\url\{([^}]+)\}/g, (_, url) => {
      const safeUrl = /^(https?:|mailto:|ftp:)/i.test(url.trim()) ? url : '#';
      return `<a href="${safeUrl}" class="text-blue-500 underline hover:text-blue-700 font-mono text-sm" target="_blank" rel="noopener">${url}</a>`;
    });

    // Page break
    html = html.replace(/\\newpage/g, '<hr class="my-8 border-t-2 border-dashed border-muted-foreground/30">');

    // Footnotes (simplified)
    html = replaceCommand(html, 'footnote', (c) => `<sup class="text-xs text-blue-500 cursor-help" title="${c}">[*]</sup>`);

    // References and labels (simplified)
    html = html.replace(/\\label\{[^}]+\}/g, '');
    html = html.replace(/\\ref\{([^}]+)\}/g, '<span class="text-blue-500">[ref:$1]</span>');

    // Remove document structure
    html = html.replace(/\\documentclass.*?\n/g, '');
    html = html.replace(/\\usepackage.*?\n/g, '');
    html = html.replace(/\\begin\{document\}/g, '');
    html = html.replace(/\\end\{document\}/g, '');
    html = html.replace(/\\maketitle/g, '');
    html = replaceCommand(html, 'title', (c) => `<h1 class="text-3xl font-bold mb-4 text-center">${c}</h1>`);
    html = replaceCommand(html, 'author', (c) => `<p class="text-muted-foreground mb-2 text-center">${c}</p>`);
    html = replaceCommand(html, 'date', (c) => `<p class="text-muted-foreground mb-4 text-center">${c}</p>`);

    // Comments (remove) — exclude \% (escaped percent)
    html = html.replace(/(?<!\\)%[^\n]*/g, '');
    // Convert \% to literal %
    html = html.replace(/\\%/g, '%');

    // Horizontal rule
    html = html.replace(/\\hrule/g, '<hr class="my-4 border-gray-300 dark:border-gray-600">');
    html = html.replace(/\\hline/g, '<hr class="my-2 border-gray-200 dark:border-gray-700">');

    // Paragraphs
    html = html.replace(/\n\n+/g, '</p><p class="my-3">');

    // Line breaks
    html = html.replace(/\\\\/g, '<br>');

    // Non-breaking space
    html = html.replace(/~/g, '&nbsp;');

    // Restore verbatim blocks from placeholders
    for (let i = 0; i < verbatimBlocks.length; i++) {
      html = html.replace(`${VERBATIM_TOKEN}${i}\x00`, verbatimBlocks[i]);
    }

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
