/**
 * Diagram Export Utilities
 * Provides functionality to export Mermaid diagrams and VegaLite charts as PNG or SVG
 */

export interface DiagramExportOptions {
  format: 'png' | 'svg';
  scale?: number;
  backgroundColor?: string;
  padding?: number;
}

/**
 * Export SVG element to file
 */
export async function exportSvgElement(
  svgElement: SVGSVGElement | null,
  filename: string,
  options: DiagramExportOptions
): Promise<void> {
  if (!svgElement) {
    throw new Error('SVG element not found');
  }

  const { format, scale = 2, backgroundColor = 'transparent', padding = 16 } = options;

  if (format === 'svg') {
    await exportAsSvg(svgElement, filename, { backgroundColor, padding });
  } else {
    await exportAsPng(svgElement, filename, { scale, backgroundColor, padding });
  }
}

/**
 * Export container's SVG as file
 */
export async function exportDiagram(
  container: HTMLElement | null,
  filename: string,
  options: DiagramExportOptions
): Promise<void> {
  if (!container) {
    throw new Error('Container not found');
  }

  const svgElement = container.querySelector('svg');
  if (!svgElement) {
    throw new Error('No SVG found in container');
  }

  await exportSvgElement(svgElement as SVGSVGElement, filename, options);
}

/**
 * Export SVG as SVG file
 */
async function exportAsSvg(
  svgElement: SVGSVGElement,
  filename: string,
  options: { backgroundColor?: string; padding?: number }
): Promise<void> {
  const { backgroundColor = 'transparent', padding = 16 } = options;

  // Clone the SVG
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  
  // Get dimensions
  const bbox = svgElement.getBBox();
  const width = bbox.width + padding * 2;
  const height = bbox.height + padding * 2;

  // Set viewBox and dimensions
  clonedSvg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`);
  clonedSvg.setAttribute('width', String(width));
  clonedSvg.setAttribute('height', String(height));

  // Add background if not transparent
  if (backgroundColor !== 'transparent') {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(bbox.x - padding));
    rect.setAttribute('y', String(bbox.y - padding));
    rect.setAttribute('width', String(width));
    rect.setAttribute('height', String(height));
    rect.setAttribute('fill', backgroundColor);
    clonedSvg.insertBefore(rect, clonedSvg.firstChild);
  }

  // Serialize to string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  // Download
  downloadFile(svgUrl, `${filename}.svg`);
  URL.revokeObjectURL(svgUrl);
}

/**
 * Export SVG as PNG file
 */
async function exportAsPng(
  svgElement: SVGSVGElement,
  filename: string,
  options: { scale?: number; backgroundColor?: string; padding?: number }
): Promise<void> {
  const { scale = 2, backgroundColor = '#ffffff', padding = 16 } = options;

  // Get dimensions
  const bbox = svgElement.getBBox();
  const width = (bbox.width + padding * 2) * scale;
  const height = (bbox.height + padding * 2) * scale;

  // Clone SVG
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  clonedSvg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`);
  clonedSvg.setAttribute('width', String(width));
  clonedSvg.setAttribute('height', String(height));

  // Serialize
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    URL.revokeObjectURL(svgUrl);
    throw new Error('Failed to get canvas context');
  }

  // Draw background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Load and draw SVG
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(svgUrl);

      // Convert to PNG
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create PNG blob'));
          return;
        }

        const pngUrl = URL.createObjectURL(blob);
        downloadFile(pngUrl, `${filename}.png`);
        URL.revokeObjectURL(pngUrl);
        resolve();
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Failed to load SVG for PNG conversion'));
    };
    img.src = svgUrl;
  });
}

/**
 * Helper to download a file
 */
function downloadFile(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copy SVG to clipboard as image
 */
export async function copySvgAsImage(
  container: HTMLElement | null,
  options: { scale?: number; backgroundColor?: string } = {}
): Promise<void> {
  if (!container) {
    throw new Error('Container not found');
  }

  const svgElement = container.querySelector('svg') as SVGSVGElement;
  if (!svgElement) {
    throw new Error('No SVG found in container');
  }

  const { scale = 2, backgroundColor = '#ffffff' } = options;

  // Get dimensions
  const bbox = svgElement.getBBox();
  const padding = 16;
  const width = (bbox.width + padding * 2) * scale;
  const height = (bbox.height + padding * 2) * scale;

  // Clone SVG
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  clonedSvg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`);
  clonedSvg.setAttribute('width', String(width));
  clonedSvg.setAttribute('height', String(height));

  // Serialize
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    URL.revokeObjectURL(svgUrl);
    throw new Error('Failed to get canvas context');
  }

  // Draw background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(svgUrl);

      try {
        const blob = await new Promise<Blob>((res, rej) => {
          canvas.toBlob((b) => {
            if (b) res(b);
            else rej(new Error('Failed to create blob'));
          }, 'image/png');
        });

        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Failed to load SVG'));
    };
    img.src = svgUrl;
  });
}

/**
 * Generate filename from diagram content
 */
export function generateDiagramFilename(content: string, type: 'mermaid' | 'vegalite'): string {
  // Extract first meaningful line
  const firstLine = content.split('\n')[0].trim();
  
  // For mermaid, try to get diagram type
  if (type === 'mermaid') {
    const match = firstLine.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph)/i);
    if (match) {
      return `${match[1].toLowerCase()}_diagram`;
    }
  }
  
  // For vegalite, try to get chart type from spec
  if (type === 'vegalite') {
    try {
      const spec = JSON.parse(content);
      if (spec.mark) {
        const mark = typeof spec.mark === 'string' ? spec.mark : spec.mark.type;
        return `${mark}_chart`;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return `${type}_export`;
}
