/**
 * PPTX Export - Generate native PowerPoint files
 * 
 * Uses pptxgenjs to create real .pptx files that can be
 * opened in Microsoft PowerPoint, Google Slides, etc.
 */

import PptxGenJS from 'pptxgenjs';
import type {
  PPTPresentation,
  PPTSlide,
  PPTTheme,
  PPTSlideLayout,
  PPTSlideElement,
} from '@/types/workflow';

// =====================
// Types
// =====================

export interface PPTXExportOptions {
  /** Include speaker notes */
  includeNotes?: boolean;
  /** Include slide numbers */
  includeSlideNumbers?: boolean;
  /** Company/Author name for metadata */
  author?: string;
  /** Company name for metadata */
  company?: string;
  /** Subject for metadata */
  subject?: string;
  /** Output quality */
  quality?: 'low' | 'medium' | 'high';
}

export interface PPTXExportResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
}

// =====================
// Layout Mapping
// =====================

const LAYOUT_MAPPINGS: Record<PPTSlideLayout, {
  titlePos: { x: number; y: number; w: number; h: number };
  contentPos: { x: number; y: number; w: number; h: number };
  imagePos?: { x: number; y: number; w: number; h: number };
}> = {
  title: {
    titlePos: { x: 0.5, y: 2.5, w: 9, h: 1.5 },
    contentPos: { x: 0.5, y: 4.2, w: 9, h: 1 },
  },
  'title-content': {
    titlePos: { x: 0.5, y: 0.5, w: 9, h: 1 },
    contentPos: { x: 0.5, y: 1.6, w: 9, h: 4 },
  },
  'two-column': {
    titlePos: { x: 0.5, y: 0.5, w: 9, h: 1 },
    contentPos: { x: 0.5, y: 1.6, w: 4.2, h: 4 },
    imagePos: { x: 5.2, y: 1.6, w: 4.3, h: 4 },
  },
  bullets: {
    titlePos: { x: 0.5, y: 0.5, w: 9, h: 1 },
    contentPos: { x: 0.5, y: 1.6, w: 9, h: 4 },
  },
  'image-left': {
    titlePos: { x: 0.5, y: 0.5, w: 9, h: 1 },
    contentPos: { x: 5.2, y: 1.6, w: 4.3, h: 4 },
    imagePos: { x: 0.5, y: 1.6, w: 4.2, h: 4 },
  },
  'image-right': {
    titlePos: { x: 0.5, y: 0.5, w: 9, h: 1 },
    contentPos: { x: 0.5, y: 1.6, w: 4.2, h: 4 },
    imagePos: { x: 5.2, y: 1.6, w: 4.3, h: 4 },
  },
  quote: {
    titlePos: { x: 0.5, y: 0.5, w: 9, h: 1 },
    contentPos: { x: 1, y: 2, w: 8, h: 3 },
  },
  chart: {
    titlePos: { x: 0.5, y: 0.5, w: 9, h: 1 },
    contentPos: { x: 0.5, y: 1.6, w: 9, h: 4 },
  },
  comparison: {
    titlePos: { x: 0.5, y: 0.5, w: 9, h: 1 },
    contentPos: { x: 0.5, y: 1.6, w: 4.2, h: 4 },
    imagePos: { x: 5.2, y: 1.6, w: 4.3, h: 4 },
  },
  section: {
    titlePos: { x: 0.5, y: 2.5, w: 9, h: 1.5 },
    contentPos: { x: 0.5, y: 4.2, w: 9, h: 1 },
  },
  closing: {
    titlePos: { x: 0.5, y: 2, w: 9, h: 1.5 },
    contentPos: { x: 0.5, y: 3.8, w: 9, h: 2 },
  },
  'full-image': {
    titlePos: { x: 0.5, y: 0.3, w: 9, h: 0.8 },
    contentPos: { x: 0.5, y: 1.2, w: 9, h: 4.3 },
  },
  timeline: {
    titlePos: { x: 0.5, y: 0.5, w: 9, h: 1 },
    contentPos: { x: 0.5, y: 1.6, w: 9, h: 4 },
  },
  table: {
    titlePos: { x: 0.5, y: 0.5, w: 9, h: 1 },
    contentPos: { x: 0.5, y: 1.6, w: 9, h: 4 },
  },
  blank: {
    titlePos: { x: 0.5, y: 0.5, w: 9, h: 1 },
    contentPos: { x: 0.5, y: 1.6, w: 9, h: 4 },
  },
  numbered: {
    titlePos: { x: 0.5, y: 0.5, w: 9, h: 1 },
    contentPos: { x: 0.5, y: 1.6, w: 9, h: 4 },
  },
};

// =====================
// Helper Functions
// =====================

/**
 * Convert hex color to pptxgenjs format
 */
function formatColor(color: string): string {
  return color.replace('#', '');
}

/**
 * Get font size based on element type
 */
function getFontSize(type: 'title' | 'subtitle' | 'body' | 'bullet'): number {
  const sizes = {
    title: 36,
    subtitle: 24,
    body: 18,
    bullet: 16,
  };
  return sizes[type];
}

/**
 * Apply theme to presentation
 */
function applyTheme(pptx: PptxGenJS, theme: PPTTheme): void {
  pptx.defineSlideMaster({
    title: 'MASTER_SLIDE',
    background: { color: formatColor(theme.backgroundColor) },
    objects: [
      {
        placeholder: {
          options: {
            name: 'title',
            type: 'title',
            x: 0.5,
            y: 0.5,
            w: 9,
            h: 1,
          },
          text: '',
        },
      },
    ],
  });
}

/**
 * Add slide to presentation
 */
function addSlide(
  pptx: PptxGenJS,
  slide: PPTSlide,
  theme: PPTTheme,
  options: PPTXExportOptions
): void {
  const pptxSlide = pptx.addSlide();
  const layout = LAYOUT_MAPPINGS[slide.layout] || LAYOUT_MAPPINGS['title-content'];

  // Set background
  if (slide.backgroundColor) {
    pptxSlide.background = { color: formatColor(slide.backgroundColor) };
  } else if (slide.backgroundImage) {
    pptxSlide.background = { 
      path: slide.backgroundImage,
    };
  } else {
    pptxSlide.background = { color: formatColor(theme.backgroundColor) };
  }

  // Add title
  if (slide.title) {
    pptxSlide.addText(slide.title, {
      x: layout.titlePos.x,
      y: layout.titlePos.y,
      w: layout.titlePos.w,
      h: layout.titlePos.h,
      fontSize: getFontSize('title'),
      fontFace: theme.headingFont,
      color: formatColor(theme.textColor),
      bold: true,
      align: slide.layout === 'title' || slide.layout === 'section' ? 'center' : 'left',
    });
  }

  // Add subtitle for title slides
  if (slide.subtitle && (slide.layout === 'title' || slide.layout === 'section')) {
    pptxSlide.addText(slide.subtitle, {
      x: layout.contentPos.x,
      y: layout.contentPos.y,
      w: layout.contentPos.w,
      h: layout.contentPos.h,
      fontSize: getFontSize('subtitle'),
      fontFace: theme.bodyFont,
      color: formatColor(theme.textColor),
      align: 'center',
    });
  }

  // Add bullets
  if (slide.bullets && slide.bullets.length > 0) {
    const bulletText = slide.bullets.map(bullet => ({
      text: bullet,
      options: {
        bullet: { type: 'bullet' as const },
        fontSize: getFontSize('bullet'),
        fontFace: theme.bodyFont,
        color: formatColor(theme.textColor),
      },
    }));

    pptxSlide.addText(bulletText, {
      x: layout.contentPos.x,
      y: layout.contentPos.y,
      w: layout.contentPos.w,
      h: layout.contentPos.h,
      valign: 'top',
    });
  }

  // Add content text (non-bullet)
  if (slide.content && !slide.bullets?.length) {
    pptxSlide.addText(slide.content, {
      x: layout.contentPos.x,
      y: layout.contentPos.y,
      w: layout.contentPos.w,
      h: layout.contentPos.h,
      fontSize: getFontSize('body'),
      fontFace: theme.bodyFont,
      color: formatColor(theme.textColor),
      valign: 'top',
    });
  }

  // Add images from elements
  const imageElements = slide.elements.filter(el => el.type === 'image');
  if (imageElements.length > 0 && layout.imagePos) {
    const imgElement = imageElements[0];
    if (imgElement.content) {
      try {
        if (imgElement.content.startsWith('data:')) {
          pptxSlide.addImage({
            data: imgElement.content,
            x: layout.imagePos.x,
            y: layout.imagePos.y,
            w: layout.imagePos.w,
            h: layout.imagePos.h,
            sizing: { type: 'contain', w: layout.imagePos.w, h: layout.imagePos.h },
          });
        } else if (imgElement.content.startsWith('http')) {
          pptxSlide.addImage({
            path: imgElement.content,
            x: layout.imagePos.x,
            y: layout.imagePos.y,
            w: layout.imagePos.w,
            h: layout.imagePos.h,
            sizing: { type: 'contain', w: layout.imagePos.w, h: layout.imagePos.h },
          });
        }
      } catch {
        // Skip invalid images
      }
    }
  }

  // Add other elements
  slide.elements.forEach((element: PPTSlideElement) => {
    addElement(pptxSlide, element, theme);
  });

  // Add speaker notes
  if (options.includeNotes && slide.notes) {
    pptxSlide.addNotes(slide.notes);
  }

  // Add slide number
  if (options.includeSlideNumbers) {
    pptxSlide.addText(String(slide.order + 1), {
      x: 9,
      y: 5.2,
      w: 0.5,
      h: 0.3,
      fontSize: 10,
      color: formatColor(theme.textColor),
      align: 'right',
    });
  }
}

/**
 * Add element to slide
 */
function addElement(
  pptxSlide: PptxGenJS.Slide,
  element: PPTSlideElement,
  theme: PPTTheme
): void {
  const pos = element.position || { x: 10, y: 10, width: 80, height: 80 };
  
  // Convert percentage to inches (assuming 10" x 5.625" slide)
  const x = (pos.x / 100) * 10;
  const y = (pos.y / 100) * 5.625;
  const w = (pos.width / 100) * 10;
  const h = (pos.height / 100) * 5.625;

  switch (element.type) {
    case 'text':
      pptxSlide.addText(element.content, {
        x, y, w, h,
        fontSize: 14,
        fontFace: theme.bodyFont,
        color: formatColor(theme.textColor),
      });
      break;

    case 'image':
      if (element.content) {
        try {
          if (element.content.startsWith('data:')) {
            // Base64 data URLs must use 'data' property
            pptxSlide.addImage({
              data: element.content,
              x, y, w, h,
              sizing: { type: 'contain', w, h },
            });
          } else if (element.content.startsWith('http')) {
            pptxSlide.addImage({
              path: element.content,
              x, y, w, h,
              sizing: { type: 'contain', w, h },
            });
          }
        } catch {
          // Skip invalid images
        }
      }
      break;

    case 'shape': {
      const shapeType = (element.metadata?.shape as string) || 'rectangle';
      const shapeColor = element.style?.backgroundColor || theme.primaryColor;
      const pptxShape = shapeType === 'circle' || shapeType === 'ellipse'
        ? 'ellipse' as const
        : 'rect' as const;
      pptxSlide.addShape(pptxShape, {
        x, y, w, h,
        fill: { color: formatColor(shapeColor) },
        rectRadius: shapeType === 'rounded' ? 0.2 : undefined,
      });
      break;
    }

    case 'code':
      pptxSlide.addText(element.content, {
        x, y, w, h,
        fontSize: 11,
        fontFace: theme.codeFont || 'Courier New',
        color: 'D4D4D4',
        fill: { color: '1E1E1E' },
        valign: 'top',
        paraSpaceAfter: 4,
        rectRadius: 0.1,
      });
      break;

    case 'table': {
      const tableData = element.metadata?.tableData as string[][] | undefined;
      if (tableData && tableData.length > 0) {
        const rows: PptxGenJS.TableRow[] = tableData.map((row, ri) =>
          row.map(cell => ({
            text: cell,
            options: {
              fontSize: 11,
              fontFace: theme.bodyFont,
              color: formatColor(theme.textColor),
              bold: ri === 0,
              fill: ri === 0 ? { color: formatColor(theme.primaryColor) + '25' } : undefined,
              border: [
                { pt: 0.5, color: formatColor(theme.primaryColor) + '60' },
                { pt: 0.5, color: formatColor(theme.primaryColor) + '60' },
                { pt: 0.5, color: formatColor(theme.primaryColor) + '60' },
                { pt: 0.5, color: formatColor(theme.primaryColor) + '60' },
              ],
            },
          }))
        );
        pptxSlide.addTable(rows, {
          x, y, w, h,
          colW: w / (tableData[0]?.length || 1),
          fontSize: 11,
          fontFace: theme.bodyFont,
          color: formatColor(theme.textColor),
        });
      } else {
        pptxSlide.addText(element.content || 'Table', {
          x, y, w, h,
          fontSize: 12,
          fontFace: theme.bodyFont,
          color: formatColor(theme.textColor),
        });
      }
      break;
    }

    case 'chart': {
      const chartType = (element.metadata?.chartType as string) || 'bar';
      const chartData = element.metadata?.chartData as { labels?: string[]; datasets?: Array<{ label: string; data: number[] }> } | undefined;
      if (chartData?.labels && chartData?.datasets) {
        try {
          // Map chart types to pptxgenjs equivalents
          let pptxChartType: 'pie' | 'doughnut' | 'line' | 'area' | 'scatter' | 'bar';
          const chartOpts: Record<string, unknown> = {
            x, y, w, h,
            showTitle: false,
            showLegend: true,
            legendPos: 'b',
            legendFontSize: 10,
          };

          switch (chartType) {
            case 'pie':
              pptxChartType = 'pie';
              chartOpts.showPercent = true;
              break;
            case 'doughnut':
              pptxChartType = 'doughnut';
              chartOpts.showPercent = true;
              chartOpts.holeSize = 50;
              break;
            case 'line':
              pptxChartType = 'line';
              chartOpts.lineSmooth = true;
              chartOpts.lineSize = 2;
              break;
            case 'area':
              pptxChartType = 'area';
              chartOpts.opacity = 50;
              break;
            case 'scatter':
              pptxChartType = 'scatter';
              chartOpts.lineSize = 0;
              break;
            case 'horizontal-bar':
              pptxChartType = 'bar';
              chartOpts.barDir = 'bar';
              break;
            default:
              pptxChartType = 'bar';
              chartOpts.barDir = 'col';
              break;
          }

          // Apply theme colors to chart
          const chartColors = [
            formatColor(theme.primaryColor),
            formatColor(theme.secondaryColor || theme.primaryColor),
            '10B981', 'F59E0B', 'EF4444', '8B5CF6', 'EC4899', '06B6D4',
          ];
          chartOpts.chartColors = chartColors;

          const chartDataForPptx = chartData.datasets.map(ds => ({
            name: ds.label,
            labels: chartData.labels!,
            values: ds.data,
          }));

          pptxSlide.addChart(pptxChartType, chartDataForPptx, chartOpts);
        } catch {
          pptxSlide.addText(`[${chartType} chart]`, {
            x, y, w, h,
            fontSize: 14,
            fontFace: theme.bodyFont,
            color: formatColor(theme.textColor),
            align: 'center',
            valign: 'middle',
          });
        }
      }
      break;
    }

    case 'video':
      pptxSlide.addText(`[Video: ${element.content || 'embedded'}]`, {
        x, y, w, h,
        fontSize: 12,
        fontFace: theme.bodyFont,
        color: formatColor(theme.textColor),
        align: 'center',
        valign: 'middle',
        fill: { color: 'F0F0F0' },
      });
      break;

    case 'icon':
      pptxSlide.addText(element.content || '●', {
        x, y, w, h,
        fontSize: 24,
        align: 'center',
        valign: 'middle',
        color: formatColor(theme.primaryColor),
      });
      break;
  }
}

// =====================
// Main Export Function
// =====================

/**
 * Create a configured PptxGenJS document with all slides
 */
function createPPTXDocument(
  presentation: PPTPresentation,
  options: PPTXExportOptions = {}
): PptxGenJS {
  const pptx = new PptxGenJS();

  // Set metadata
  pptx.author = options.author || 'Cognia';
  pptx.company = options.company || '';
  pptx.subject = options.subject || presentation.description || '';
  pptx.title = presentation.title;

  // Set layout
  pptx.layout = presentation.aspectRatio === '4:3' ? 'LAYOUT_4x3' : 'LAYOUT_16x9';

  // Apply theme
  applyTheme(pptx, presentation.theme);

  // Add slides
  for (const slide of presentation.slides) {
    addSlide(pptx, slide, presentation.theme, options);
  }

  return pptx;
}

/**
 * Generate a safe filename for the presentation
 */
function generateFilename(title: string): string {
  const safeTitle = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${safeTitle}-${timestamp}.pptx`;
}

/**
 * Export presentation to PPTX format
 */
export async function exportToPPTX(
  presentation: PPTPresentation,
  options: PPTXExportOptions = {}
): Promise<PPTXExportResult> {
  try {
    const pptx = createPPTXDocument(presentation, options);
    const blob = await pptx.write({ outputType: 'blob' }) as Blob;
    const filename = generateFilename(presentation.title);

    return {
      success: true,
      blob,
      filename,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export PPTX',
    };
  }
}

/**
 * Download presentation as PPTX file
 */
export async function downloadPPTX(
  presentation: PPTPresentation,
  options: PPTXExportOptions = {}
): Promise<PPTXExportResult> {
  const result = await exportToPPTX(presentation, options);

  if (result.success && result.blob && result.filename) {
    // Create download link
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return result;
}

/**
 * Export presentation to PPTX and return as base64
 */
export async function exportToPPTXBase64(
  presentation: PPTPresentation,
  options: PPTXExportOptions = {}
): Promise<{ success: boolean; base64?: string; error?: string }> {
  try {
    const pptx = createPPTXDocument(presentation, options);
    const base64 = await pptx.write({ outputType: 'base64' }) as string;

    return {
      success: true,
      base64,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export PPTX',
    };
  }
}
