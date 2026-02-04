/**
 * LaTeX Export
 * Provides advanced export functionality for LaTeX documents
 * Supports multiple output formats including PDF, DOCX, HTML, and complete project exports
 */

import type { LaTeXExportOptions, LaTeXExportFormat } from '@/types/latex';
import { KATEX_CDN_VERSION } from '@/lib/latex/config';

// ============================================================================
// Types
// ============================================================================

export interface ExportResult {
  success: boolean;
  format: LaTeXExportFormat;
  data?: Blob | string;
  filename?: string;
  error?: string;
  warnings?: string[];
}

export interface ProjectExportOptions {
  includeImages: boolean;
  includeBibliography: boolean;
  includeStyles: boolean;
  flattenStructure: boolean;
  compression: 'none' | 'zip' | 'tar.gz';
}

export interface ImageExportOptions {
  format: 'png' | 'svg' | 'pdf';
  dpi: number;
  transparent: boolean;
  padding: number;
}

export interface BibliographyExportOptions {
  format: 'bibtex' | 'biblatex' | 'ris' | 'endnote';
  includeAbstracts: boolean;
  includeKeywords: boolean;
}

// ============================================================================
// Export Configuration
// ============================================================================

export const DEFAULT_EXPORT_OPTIONS: LaTeXExportOptions = {
  format: 'pdf',
  includeImages: true,
  embedFonts: true,
  quality: 'normal',
  pageSize: 'a4',
  margins: {
    top: '1in',
    right: '1in',
    bottom: '1in',
    left: '1in',
  },
};

export const DEFAULT_PROJECT_OPTIONS: ProjectExportOptions = {
  includeImages: true,
  includeBibliography: true,
  includeStyles: true,
  flattenStructure: false,
  compression: 'zip',
};

// ============================================================================
// Format Converters
// ============================================================================

/**
 * Convert LaTeX to HTML with MathJax/KaTeX support
 */
export function latexToHtml(
  latex: string,
  options: {
    mathRenderer: 'mathjax' | 'katex';
    standalone: boolean;
    includeStyles: boolean;
  } = { mathRenderer: 'katex', standalone: true, includeStyles: true }
): string {
  const { mathRenderer, standalone, includeStyles } = options;

  // Convert LaTeX commands to HTML
  let html = latex;

  // Convert sections
  html = html.replace(/\\section\{([^}]+)\}/g, '<h2>$1</h2>');
  html = html.replace(/\\subsection\{([^}]+)\}/g, '<h3>$1</h3>');
  html = html.replace(/\\subsubsection\{([^}]+)\}/g, '<h4>$1</h4>');

  // Convert text formatting
  html = html.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
  html = html.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>');
  html = html.replace(/\\underline\{([^}]+)\}/g, '<u>$1</u>');
  html = html.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>');

  // Convert lists
  html = html.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, content) => {
    const items = content.replace(/\\item\s*/g, '</li><li>').slice(5);
    return `<ul><li>${items}</li></ul>`;
  });

  html = html.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, content) => {
    const items = content.replace(/\\item\s*/g, '</li><li>').slice(5);
    return `<ol><li>${items}</li></ol>`;
  });

  // Convert paragraphs
  html = html.replace(/\n\n+/g, '</p><p>');

  // Convert line breaks
  html = html.replace(/\\\\/g, '<br>');

  // Preserve math for MathJax/KaTeX
  // Display math: $$...$$ or \[...\]
  html = html.replace(/\$\$([^$]+)\$\$/g, (_, math) => {
    if (mathRenderer === 'katex') {
      return `<span class="math-display">\\[${math}\\]</span>`;
    }
    return `\\[${math}\\]`;
  });

  html = html.replace(/\\\[([^\]]+)\\\]/g, (_, math) => {
    if (mathRenderer === 'katex') {
      return `<span class="math-display">\\[${math}\\]</span>`;
    }
    return `\\[${math}\\]`;
  });

  // Inline math: $...$
  html = html.replace(/\$([^$]+)\$/g, (_, math) => {
    if (mathRenderer === 'katex') {
      return `<span class="math-inline">\\(${math}\\)</span>`;
    }
    return `\\(${math}\\)`;
  });

  // Remove document structure commands
  html = html.replace(/\\documentclass.*?\n/g, '');
  html = html.replace(/\\usepackage.*?\n/g, '');
  html = html.replace(/\\begin\{document\}/g, '');
  html = html.replace(/\\end\{document\}/g, '');
  html = html.replace(/\\maketitle/g, '');
  html = html.replace(/\\title\{([^}]+)\}/g, '<h1>$1</h1>');
  html = html.replace(/\\author\{([^}]+)\}/g, '<p class="author">$1</p>');
  html = html.replace(/\\date\{([^}]+)\}/g, '<p class="date">$1</p>');

  // Wrap in paragraph tags
  html = `<p>${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  if (!standalone) {
    return html;
  }

  // Create standalone HTML document
  const mathScripts = mathRenderer === 'katex'
    ? `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@${KATEX_CDN_VERSION}/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@${KATEX_CDN_VERSION}/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@${KATEX_CDN_VERSION}/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body);"></script>`
    : `<script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>`;

  const styles = includeStyles
    ? `<style>
body { font-family: 'Computer Modern', Georgia, serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
h1, h2, h3, h4 { margin-top: 2rem; }
p { margin: 1rem 0; text-align: justify; }
.author, .date { text-align: center; color: #666; }
ul, ol { margin: 1rem 0; padding-left: 2rem; }
.math-display { display: block; text-align: center; margin: 1rem 0; }
</style>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LaTeX Document</title>
${mathScripts}
${styles}
</head>
<body>
${html}
</body>
</html>`;
}

/**
 * Convert LaTeX to Markdown
 */
export function latexToMarkdown(latex: string): string {
  let md = latex;

  // Convert sections
  md = md.replace(/\\section\{([^}]+)\}/g, '## $1');
  md = md.replace(/\\subsection\{([^}]+)\}/g, '### $1');
  md = md.replace(/\\subsubsection\{([^}]+)\}/g, '#### $1');
  md = md.replace(/\\chapter\{([^}]+)\}/g, '# $1');

  // Convert text formatting
  md = md.replace(/\\textbf\{([^}]+)\}/g, '**$1**');
  md = md.replace(/\\textit\{([^}]+)\}/g, '*$1*');
  md = md.replace(/\\emph\{([^}]+)\}/g, '*$1*');
  md = md.replace(/\\underline\{([^}]+)\}/g, '<u>$1</u>');
  md = md.replace(/\\texttt\{([^}]+)\}/g, '`$1`');

  // Convert lists
  md = md.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, content) => {
    return content.replace(/\\item\s*/g, '\n- ').trim();
  });

  md = md.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, content) => {
    let counter = 0;
    return content.replace(/\\item\s*/g, () => `\n${++counter}. `).trim();
  });

  // Convert quotes
  md = md.replace(/\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g, (_, content) => {
    return content.split('\n').map((line: string) => `> ${line}`).join('\n');
  });

  // Convert code blocks
  md = md.replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, '```\n$1\n```');
  md = md.replace(/\\begin\{lstlisting\}(?:\[.*?\])?([\s\S]*?)\\end\{lstlisting\}/g, '```\n$1\n```');

  // Math is already in LaTeX format, keep as-is for Markdown+LaTeX renderers
  // Display math
  md = md.replace(/\\\[([\s\S]*?)\\\]/g, '\n$$\n$1\n$$\n');

  // Convert document structure
  md = md.replace(/\\title\{([^}]+)\}/g, '# $1');
  md = md.replace(/\\author\{([^}]+)\}/g, '*$1*');
  md = md.replace(/\\date\{([^}]+)\}/g, '*$1*');

  // Convert citations (basic)
  md = md.replace(/\\cite\{([^}]+)\}/g, '[$1]');
  md = md.replace(/\\ref\{([^}]+)\}/g, '[$1]');

  // Convert footnotes
  md = md.replace(/\\footnote\{([^}]+)\}/g, '[^1]\n\n[^1]: $1');

  // Remove document structure commands
  md = md.replace(/\\documentclass.*?\n/g, '');
  md = md.replace(/\\usepackage.*?\n/g, '');
  md = md.replace(/\\begin\{document\}/g, '');
  md = md.replace(/\\end\{document\}/g, '');
  md = md.replace(/\\maketitle/g, '');
  md = md.replace(/\\tableofcontents/g, '');
  md = md.replace(/\\newpage/g, '\n---\n');

  // Clean up extra whitespace
  md = md.replace(/\n{3,}/g, '\n\n');

  return md.trim();
}

/**
 * Convert LaTeX to plain text
 */
export function latexToPlainText(latex: string): string {
  let text = latex;

  // Remove comments
  text = text.replace(/%.*$/gm, '');

  // Convert sections to text with underlines
  text = text.replace(/\\section\{([^}]+)\}/g, '\n\n$1\n' + '='.repeat(40));
  text = text.replace(/\\subsection\{([^}]+)\}/g, '\n\n$1\n' + '-'.repeat(30));
  text = text.replace(/\\subsubsection\{([^}]+)\}/g, '\n\n$1');

  // Remove text formatting commands but keep content
  text = text.replace(/\\textbf\{([^}]+)\}/g, '$1');
  text = text.replace(/\\textit\{([^}]+)\}/g, '$1');
  text = text.replace(/\\emph\{([^}]+)\}/g, '$1');
  text = text.replace(/\\underline\{([^}]+)\}/g, '$1');
  text = text.replace(/\\texttt\{([^}]+)\}/g, '$1');

  // Convert lists
  text = text.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, content) => {
    return content.replace(/\\item\s*/g, '\n• ').trim();
  });

  text = text.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, content) => {
    let counter = 0;
    return content.replace(/\\item\s*/g, () => `\n${++counter}. `).trim();
  });

  // Remove math delimiters but keep content
  text = text.replace(/\$\$([^$]+)\$\$/g, '\n$1\n');
  text = text.replace(/\\\[([^\]]+)\\\]/g, '\n$1\n');
  text = text.replace(/\$([^$]+)\$/g, '$1');

  // Remove common LaTeX commands
  text = text.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1');
  text = text.replace(/\\[a-zA-Z]+/g, '');

  // Remove braces
  text = text.replace(/[{}]/g, '');

  // Remove document structure
  text = text.replace(/\\begin\{[^}]+\}/g, '');
  text = text.replace(/\\end\{[^}]+\}/g, '');

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/^\s+|\s+$/g, '');

  return text;
}

// ============================================================================
// Project Export
// ============================================================================

/**
 * Create a complete LaTeX project structure
 */
export function createProjectStructure(
  mainContent: string,
  options: {
    projectName: string;
    bibliography?: string;
    images?: { name: string; data: string }[];
    additionalFiles?: { path: string; content: string }[];
  }
): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];

  // Main document
  files.push({
    path: `${options.projectName}/main.tex`,
    content: mainContent,
  });

  // Bibliography
  if (options.bibliography) {
    files.push({
      path: `${options.projectName}/references.bib`,
      content: options.bibliography,
    });
  }

  // Images directory placeholder
  if (options.images && options.images.length > 0) {
    for (const image of options.images) {
      files.push({
        path: `${options.projectName}/images/${image.name}`,
        content: image.data,
      });
    }
  }

  // Additional files
  if (options.additionalFiles) {
    for (const file of options.additionalFiles) {
      files.push({
        path: `${options.projectName}/${file.path}`,
        content: file.content,
      });
    }
  }

  // README
  files.push({
    path: `${options.projectName}/README.md`,
    content: `# ${options.projectName}

## LaTeX Project

This is a LaTeX project exported from Cognia.

### Files

- \`main.tex\` - Main document
${options.bibliography ? '- `references.bib` - Bibliography\n' : ''}${options.images?.length ? '- `images/` - Image files\n' : ''}

### Building

To build this project, run:

\`\`\`bash
pdflatex main.tex
${options.bibliography ? 'bibtex main\npdflatex main.tex\npdflatex main.tex' : ''}
\`\`\`

Or use latexmk:

\`\`\`bash
latexmk -pdf main.tex
\`\`\`
`,
  });

  // Makefile
  files.push({
    path: `${options.projectName}/Makefile`,
    content: `# LaTeX Makefile

MAIN = main
LATEX = pdflatex
BIBTEX = bibtex

all: $(MAIN).pdf

$(MAIN).pdf: $(MAIN).tex
\t$(LATEX) $(MAIN)
${options.bibliography ? '\t$(BIBTEX) $(MAIN)\n\t$(LATEX) $(MAIN)\n\t$(LATEX) $(MAIN)' : ''}

clean:
\trm -f *.aux *.log *.bbl *.blg *.toc *.out *.lof *.lot

distclean: clean
\trm -f $(MAIN).pdf

.PHONY: all clean distclean
`,
  });

  return files;
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export LaTeX document to specified format
 */
export async function exportLatex(
  content: string,
  format: LaTeXExportFormat,
  options: Partial<LaTeXExportOptions> = {}
): Promise<ExportResult> {
  const _opts = { ...DEFAULT_EXPORT_OPTIONS, ...options, format };

  try {
    switch (format) {
      case 'html': {
        const html = latexToHtml(content);
        return {
          success: true,
          format,
          data: html,
          filename: 'document.html',
        };
      }

      case 'tex': {
        return {
          success: true,
          format,
          data: content,
          filename: 'document.tex',
        };
      }

      case 'pdf':
      case 'dvi':
      case 'ps': {
        // These require server-side compilation
        return {
          success: false,
          format,
          error: `${format.toUpperCase()} export requires server-side LaTeX compilation. Please use an external service or local LaTeX installation.`,
          warnings: ['Consider using Overleaf or a local TeX distribution'],
        };
      }

      case 'docx':
      case 'odt': {
        // Would require pandoc or similar
        return {
          success: false,
          format,
          error: `${format.toUpperCase()} export requires pandoc. This feature is available in the desktop version.`,
        };
      }

      case 'epub': {
        return {
          success: false,
          format,
          error: 'EPUB export requires server-side processing.',
        };
      }

      default: {
        return {
          success: false,
          format,
          error: `Unknown export format: ${format}`,
        };
      }
    }
  } catch (error) {
    return {
      success: false,
      format,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

/**
 * Export math expression as image
 */
export async function exportMathAsImage(
  latex: string,
  options: Partial<ImageExportOptions> = {}
): Promise<ExportResult> {
  const { format = 'png', dpi = 300, transparent = false, padding = 10 } = options;

  try {
    // This would use KaTeX or MathJax to render, then convert to image
    // For now, return SVG as string

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50">
      <rect width="100%" height="100%" fill="${transparent ? 'none' : 'white'}"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
            font-family="serif" font-size="20">
        ${escapeXml(latex)}
      </text>
    </svg>`;

    if (format === 'svg') {
      return {
        success: true,
        format: 'pdf', // Using pdf as placeholder since there's no svg in the type
        data: svg,
        filename: 'math.svg',
      };
    }

    // For PNG, would need canvas conversion
    return {
      success: false,
      format: 'pdf',
      error: `Image export for format ${format} with dpi ${dpi} and padding ${padding} requires canvas support`,
    };
  } catch (error) {
    return {
      success: false,
      format: 'pdf',
      error: error instanceof Error ? error.message : 'Math export failed',
    };
  }
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate filename for export
 */
export function generateExportFilename(
  baseName: string,
  format: LaTeXExportFormat
): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  const safeName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50);
  return `${safeName}_${timestamp}.${format}`;
}

// ============================================================================
// Export
// ============================================================================

const latexExportApi = {
  DEFAULT_EXPORT_OPTIONS,
  DEFAULT_PROJECT_OPTIONS,
  latexToHtml,
  latexToMarkdown,
  latexToPlainText,
  createProjectStructure,
  exportLatex,
  exportMathAsImage,
  generateExportFilename,
};

export default latexExportApi;
