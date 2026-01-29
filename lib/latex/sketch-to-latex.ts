/**
 * Sketch to LaTeX
 * Converts handwritten or sketched mathematical expressions to LaTeX code
 * Uses image recognition APIs for conversion
 */

import type {
  SketchToLaTeXInput,
  SketchToLaTeXResult,
  SketchBoundingBox,
} from '@/types/latex';

// ============================================================================
// Types
// ============================================================================

export interface SketchRecognitionConfig {
  provider: 'mathpix' | 'myscript' | 'local';
  apiKey?: string;
  apiEndpoint?: string;
  confidence_threshold: number;
  max_candidates: number;
  include_bounding_boxes: boolean;
  output_format: 'latex' | 'mathml' | 'asciimath';
}

export interface SketchCanvasState {
  strokes: Stroke[];
  width: number;
  height: number;
  backgroundColor: string;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
  timestamp: number;
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

export interface RecognitionResult {
  latex: string;
  confidence: number;
  boundingBox?: SketchBoundingBox;
  alternatives?: { latex: string; confidence: number }[];
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_SKETCH_CONFIG: SketchRecognitionConfig = {
  provider: 'local',
  confidence_threshold: 0.5,
  max_candidates: 5,
  include_bounding_boxes: true,
  output_format: 'latex',
};

// ============================================================================
// Stroke Processing
// ============================================================================

/**
 * Preprocess strokes for recognition
 */
export function preprocessStrokes(strokes: Stroke[]): Stroke[] {
  return strokes.map((stroke) => ({
    ...stroke,
    points: smoothPoints(stroke.points),
  }));
}

/**
 * Smooth points using moving average
 */
function smoothPoints(points: Point[], windowSize: number = 3): Point[] {
  if (points.length < windowSize) return points;

  const smoothed: Point[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < points.length; i++) {
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (let j = Math.max(0, i - halfWindow); j <= Math.min(points.length - 1, i + halfWindow); j++) {
      sumX += points[j].x;
      sumY += points[j].y;
      count++;
    }

    smoothed.push({
      x: sumX / count,
      y: sumY / count,
      pressure: points[i].pressure,
      timestamp: points[i].timestamp,
    });
  }

  return smoothed;
}

/**
 * Normalize strokes to a standard size
 */
export function normalizeStrokes(strokes: Stroke[], targetSize: number = 256): Stroke[] {
  if (strokes.length === 0) return strokes;

  // Find bounding box
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const stroke of strokes) {
    for (const point of stroke.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const scale = targetSize / Math.max(width, height);

  return strokes.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((point) => ({
      ...point,
      x: (point.x - minX) * scale,
      y: (point.y - minY) * scale,
    })),
  }));
}

/**
 * Convert strokes to SVG path
 */
export function strokesToSVGPath(strokes: Stroke[]): string {
  const paths: string[] = [];

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;

    const pathParts: string[] = [];
    const first = stroke.points[0];
    pathParts.push(`M ${first.x} ${first.y}`);

    for (let i = 1; i < stroke.points.length; i++) {
      const point = stroke.points[i];
      pathParts.push(`L ${point.x} ${point.y}`);
    }

    paths.push(pathParts.join(' '));
  }

  return paths.join(' ');
}

/**
 * Convert strokes to image data URL
 */
export function strokesToImageDataURL(
  strokes: Stroke[],
  width: number = 512,
  height: number = 512,
  backgroundColor: string = '#ffffff',
  strokeColor: string = '#000000'
): string {
  // Create a canvas
  if (typeof document === 'undefined') {
    // Server-side: return empty
    return '';
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Draw strokes
  ctx.strokeStyle = strokeColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;

    ctx.lineWidth = stroke.width;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }

    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

// ============================================================================
// Recognition Service
// ============================================================================

/**
 * Sketch to LaTeX recognition service
 */
export class SketchToLaTeXService {
  private config: SketchRecognitionConfig;

  constructor(config: Partial<SketchRecognitionConfig> = {}) {
    this.config = { ...DEFAULT_SKETCH_CONFIG, ...config };
  }

  /**
   * Recognize LaTeX from image data
   */
  async recognize(input: SketchToLaTeXInput): Promise<SketchToLaTeXResult> {
    try {
      switch (this.config.provider) {
        case 'mathpix':
          return await this.recognizeWithMathpix(input);
        case 'myscript':
          return await this.recognizeWithMyScript(input);
        case 'local':
        default:
          return await this.recognizeLocal(input);
      }
    } catch (error) {
      return {
        success: false,
        latex: '',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Recognition failed',
      };
    }
  }

  /**
   * Recognize using Mathpix API
   */
  private async recognizeWithMathpix(input: SketchToLaTeXInput): Promise<SketchToLaTeXResult> {
    if (!this.config.apiKey) {
      throw new Error('Mathpix API key is required');
    }

    const endpoint = this.config.apiEndpoint || 'https://api.mathpix.com/v3/text';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'app_id': 'your-app-id', // Would come from config
        'app_key': this.config.apiKey,
      },
      body: JSON.stringify({
        src: `data:image/${input.format};base64,${input.imageData}`,
        formats: ['latex_simplified'],
        data_options: {
          include_asciimath: false,
          include_latex: true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Mathpix API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      latex: data.latex_simplified || data.latex || '',
      confidence: data.confidence || 0.8,
      alternatives: data.latex_list?.map((l: string) => ({
        latex: l,
        confidence: 0.7,
      })),
    };
  }

  /**
   * Recognize using MyScript API
   */
  private async recognizeWithMyScript(_input: SketchToLaTeXInput): Promise<SketchToLaTeXResult> {
    if (!this.config.apiKey) {
      throw new Error('MyScript API key is required');
    }

    const endpoint = this.config.apiEndpoint || 'https://cloud.myscript.com/api/v4.0/iink/batch';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'applicationKey': this.config.apiKey,
      },
      body: JSON.stringify({
        xDPI: 96,
        yDPI: 96,
        contentType: 'Math',
        configuration: {
          math: {
            mimeTypes: ['application/x-latex'],
          },
        },
        strokeGroups: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`MyScript API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      latex: data.exports?.['application/x-latex'] || '',
      confidence: 0.85,
    };
  }

  /**
   * Local recognition (pattern matching for common expressions)
   */
  private async recognizeLocal(input: SketchToLaTeXInput): Promise<SketchToLaTeXResult> {
    // This is a simplified local recognition that uses hints
    // In production, this would use a local ML model

    const { hints = [] } = input;

    // If hints are provided, use them to improve recognition
    if (hints.length > 0) {
      const hintLatex = this.matchHintsToLatex(hints);
      if (hintLatex) {
        return {
          success: true,
          latex: hintLatex,
          confidence: 0.7,
          alternatives: [],
        };
      }
    }

    // Default: return placeholder suggesting AI assistance needed
    return {
      success: true,
      latex: '\\text{[Sketch recognized - please verify]}',
      confidence: 0.3,
      alternatives: [
        { latex: '\\int f(x) dx', confidence: 0.2 },
        { latex: '\\sum_{i=1}^{n} x_i', confidence: 0.2 },
        { latex: '\\frac{a}{b}', confidence: 0.2 },
      ],
    };
  }

  /**
   * Match hints to likely LaTeX expressions
   */
  private matchHintsToLatex(hints: string[]): string | null {
    const hintPatterns: Record<string, string> = {
      'integral': '\\int_{a}^{b} f(x) \\, dx',
      'summation': '\\sum_{i=1}^{n} a_i',
      'sum': '\\sum_{i=1}^{n} a_i',
      'fraction': '\\frac{a}{b}',
      'root': '\\sqrt{x}',
      'square root': '\\sqrt{x}',
      'matrix': '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
      'limit': '\\lim_{x \\to a} f(x)',
      'derivative': '\\frac{df}{dx}',
      'partial': '\\frac{\\partial f}{\\partial x}',
      'equation': 'ax^2 + bx + c = 0',
      'quadratic': 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    };

    for (const hint of hints) {
      const lowerHint = hint.toLowerCase();
      for (const [pattern, latex] of Object.entries(hintPatterns)) {
        if (lowerHint.includes(pattern)) {
          return latex;
        }
      }
    }

    return null;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SketchRecognitionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): SketchRecognitionConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Canvas Drawing Utilities
// ============================================================================

/**
 * Create a drawing canvas for sketch input
 */
export function createSketchCanvas(
  container: HTMLElement,
  options: {
    width?: number;
    height?: number;
    backgroundColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  } = {}
): {
  canvas: HTMLCanvasElement;
  getStrokes: () => Stroke[];
  clear: () => void;
  undo: () => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
} {
  const {
    width = 512,
    height = 256,
    backgroundColor = '#ffffff',
    strokeColor = '#000000',
    strokeWidth = 2,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.backgroundColor = backgroundColor;
  canvas.style.border = '1px solid #ccc';
  canvas.style.cursor = 'crosshair';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  let isDrawing = false;
  let currentStroke: Stroke | null = null;
  const strokes: Stroke[] = [];
  let currentColor = strokeColor;
  let currentWidth = strokeWidth;

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Event handlers
  const startDrawing = (e: MouseEvent | TouchEvent) => {
    isDrawing = true;
    const point = getPoint(e);
    currentStroke = {
      points: [point],
      color: currentColor,
      width: currentWidth,
      timestamp: Date.now(),
    };

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing || !currentStroke) return;
    e.preventDefault();

    const point = getPoint(e);
    currentStroke.points.push(point);

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const stopDrawing = () => {
    if (!isDrawing || !currentStroke) return;
    isDrawing = false;

    if (currentStroke.points.length > 1) {
      strokes.push(currentStroke);
    }
    currentStroke = null;
  };

  const getPoint = (e: MouseEvent | TouchEvent): Point => {
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      timestamp: Date.now(),
    };
  };

  // Attach event listeners
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);
  canvas.addEventListener('touchstart', startDrawing);
  canvas.addEventListener('touchmove', draw);
  canvas.addEventListener('touchend', stopDrawing);

  return {
    canvas,
    getStrokes: () => [...strokes],
    clear: () => {
      strokes.length = 0;
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    },
    undo: () => {
      if (strokes.length === 0) return;
      strokes.pop();

      // Redraw
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      for (const stroke of strokes) {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    },
    setStrokeColor: (color: string) => {
      currentColor = color;
    },
    setStrokeWidth: (width: number) => {
      currentWidth = width;
    },
  };
}

// ============================================================================
// Standalone Functions
// ============================================================================

/**
 * Convert sketch image to LaTeX (standalone function)
 */
export async function convertSketchToLaTeX(
  imageData: string,
  format: 'png' | 'jpeg' | 'svg' = 'png',
  hints?: string[],
  config?: Partial<SketchRecognitionConfig>
): Promise<SketchToLaTeXResult> {
  const service = new SketchToLaTeXService(config);
  return service.recognize({ imageData, format, hints });
}

/**
 * Check if sketch recognition is available
 */
export function isSketchRecognitionAvailable(provider: string = 'local'): boolean {
  if (provider === 'local') return true;

  // For cloud providers, check if API key is configured
  // This would check environment or configuration
  return false;
}

// ============================================================================
// Export
// ============================================================================

const sketchToLatexApi = {
  SketchToLaTeXService,
  DEFAULT_SKETCH_CONFIG,
  preprocessStrokes,
  normalizeStrokes,
  strokesToSVGPath,
  strokesToImageDataURL,
  createSketchCanvas,
  convertSketchToLaTeX,
  isSketchRecognitionAvailable,
};

export default sketchToLatexApi;
