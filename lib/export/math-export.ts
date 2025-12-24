/**
 * Math Export Utilities
 * Provides functionality to export rendered LaTeX math as PNG or SVG
 */

export interface MathExportOptions {
  format: 'png' | 'svg';
  scale?: number;
  backgroundColor?: string;
  padding?: number;
}

/**
 * Convert a KaTeX rendered HTML element to SVG string
 */
export function mathToSvg(
  element: HTMLElement,
  options: { backgroundColor?: string; padding?: number } = {}
): string {
  const { backgroundColor = 'transparent', padding = 16 } = options;
  
  // Get the computed dimensions
  const rect = element.getBoundingClientRect();
  const width = rect.width + padding * 2;
  const height = rect.height + padding * 2;
  
  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Get all computed styles for KaTeX elements
  const katexStyles = getKatexStyles();
  
  // Create SVG with foreignObject
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <style type="text/css">
      ${katexStyles}
    </style>
  </defs>
  <rect width="100%" height="100%" fill="${backgroundColor}"/>
  <foreignObject x="${padding}" y="${padding}" width="${rect.width}" height="${rect.height}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: KaTeX_Main, 'Times New Roman', serif;">
      ${clone.outerHTML}
    </div>
  </foreignObject>
</svg>`;

  return svg;
}

/**
 * Convert a KaTeX rendered HTML element to PNG data URL
 */
export async function mathToPng(
  element: HTMLElement,
  options: { scale?: number; backgroundColor?: string; padding?: number } = {}
): Promise<string> {
  const { scale = 2, backgroundColor = '#ffffff', padding = 16 } = options;
  
  const rect = element.getBoundingClientRect();
  const width = (rect.width + padding * 2) * scale;
  const height = (rect.height + padding * 2) * scale;
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
  
  // Use html2canvas-like approach with SVG foreignObject
  const svgString = mathToSvg(element, { backgroundColor, padding });
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(svgUrl);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Failed to load SVG for PNG conversion'));
    };
    img.src = svgUrl;
  });
}

/**
 * Export math element to file
 */
export async function exportMath(
  element: HTMLElement,
  filename: string,
  options: MathExportOptions
): Promise<void> {
  const { format, scale = 2, backgroundColor, padding = 16 } = options;
  
  let dataUrl: string;
  let extension: string;
  
  if (format === 'svg') {
    const svgString = mathToSvg(element, { backgroundColor, padding });
    dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    extension = 'svg';
  } else {
    dataUrl = await mathToPng(element, { scale, backgroundColor, padding });
    extension = 'png';
  }
  
  // Create download link
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${filename}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copy math as image to clipboard
 */
export async function copyMathAsImage(
  element: HTMLElement,
  options: { scale?: number; backgroundColor?: string } = {}
): Promise<void> {
  const dataUrl = await mathToPng(element, options);
  
  // Convert data URL to blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  
  // Copy to clipboard
  await navigator.clipboard.write([
    new ClipboardItem({
      [blob.type]: blob,
    }),
  ]);
}

/**
 * Get essential KaTeX CSS styles for embedding in SVG
 */
function getKatexStyles(): string {
  // Extract minimal KaTeX styles needed for rendering
  return `
    .katex {
      font: normal 1.21em KaTeX_Main, 'Times New Roman', serif;
      line-height: 1.2;
      text-indent: 0;
      text-rendering: auto;
    }
    .katex-display {
      display: block;
      margin: 1em 0;
      text-align: center;
    }
    .katex-display > .katex {
      display: block;
      text-align: center;
      white-space: nowrap;
    }
    .katex .base {
      position: relative;
      display: inline-block;
      white-space: nowrap;
      width: min-content;
    }
    .katex .strut {
      display: inline-block;
    }
    .katex .mord, .katex .mbin, .katex .mrel, .katex .mopen, .katex .mclose, 
    .katex .mpunct, .katex .minner, .katex .mop {
      display: inline-block;
    }
    .katex .mfrac {
      display: inline-block;
      text-align: center;
    }
    .katex .mfrac > span {
      display: block;
    }
    .katex .sqrt {
      display: inline-block;
    }
    .katex .sqrt > .sqrt-sign {
      position: relative;
    }
    .katex .vlist-t {
      display: inline-table;
      table-layout: fixed;
    }
    .katex .vlist-r {
      display: table-row;
    }
    .katex .vlist {
      display: table-cell;
      vertical-align: bottom;
      position: relative;
    }
  `;
}

/**
 * Generate a safe filename from LaTeX content
 */
export function generateMathFilename(latex: string): string {
  // Take first 30 chars, remove special characters
  const safe = latex
    .slice(0, 30)
    .replace(/[\\{}$^_]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  
  return safe || 'math_expression';
}
