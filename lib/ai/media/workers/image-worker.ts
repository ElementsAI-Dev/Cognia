/// <reference lib="webworker" />

/**
 * Image Processing Web Worker
 * Offloads heavy image processing operations to a separate thread
 */

// Inline type definitions to make this worker file self-contained
// (Web Workers are copied as standalone files during build)

interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  sharpen: number;
}

type WorkerMessageType =
  | 'load'
  | 'adjust'
  | 'filter'
  | 'transform'
  | 'export'
  | 'histogram'
  | 'levels'
  | 'curves'
  | 'hsl'
  | 'noise-reduction'
  | 'sharpen'
  | 'blur';

type WorkerResponseType = 'success' | 'error' | 'progress';

interface LevelsOptions {
  inputBlack: number;
  inputWhite: number;
  inputGamma: number;
  outputBlack: number;
  outputWhite: number;
  channel: 'rgb' | 'r' | 'g' | 'b';
}

interface CurvePoint {
  x: number;
  y: number;
}

interface CurvesOptions {
  rgb: CurvePoint[];
  red?: CurvePoint[];
  green?: CurvePoint[];
  blue?: CurvePoint[];
}

interface HSLOptions {
  hue: number;
  saturation: number;
  lightness: number;
  targetHue?: number;
  hueRange?: number;
}

interface HistogramData {
  red: number[];
  green: number[];
  blue: number[];
  luminance: number[];
}

interface WorkerPayload {
  imageData?: ImageData;
  adjustments?: ImageAdjustments;
  filter?: { id: string; name: string; params?: Record<string, unknown> };
  transform?: { rotate?: number; flipHorizontal?: boolean; flipVertical?: boolean; scale?: number; cropRegion?: { x: number; y: number; width: number; height: number } };
  exportOptions?: { format: 'png' | 'jpeg' | 'webp'; quality: number };
  levels?: LevelsOptions;
  curves?: CurvesOptions;
  hsl?: HSLOptions;
  noiseReduction?: { strength: number; method: 'median' | 'bilateral' | 'gaussian'; preserveDetail: number };
  sharpen?: { amount: number; radius: number; threshold: number; method: 'unsharp-mask' | 'high-pass' | 'laplacian' };
  blur?: { radius: number; method: 'gaussian' | 'box' | 'motion' | 'radial'; angle?: number; centerX?: number; centerY?: number };
}

interface WorkerMessage {
  id: string;
  type: WorkerMessageType;
  payload: WorkerPayload;
  transferables?: Transferable[];
}

interface WorkerResponse {
  id: string;
  type: WorkerResponseType;
  data?: ImageData | Uint8ClampedArray | HistogramData;
  error?: string;
  progress?: number;
  duration?: number;
}

const ctx: Worker = self as unknown as Worker;

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Apply brightness adjustment
 */
function applyBrightness(data: Uint8ClampedArray, brightness: number): void {
  const adjustment = brightness * 2.55;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(data[i] + adjustment, 0, 255);
    data[i + 1] = clamp(data[i + 1] + adjustment, 0, 255);
    data[i + 2] = clamp(data[i + 2] + adjustment, 0, 255);
  }
}

/**
 * Apply contrast adjustment
 */
function applyContrast(data: Uint8ClampedArray, contrast: number): void {
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(factor * (data[i] - 128) + 128, 0, 255);
    data[i + 1] = clamp(factor * (data[i + 1] - 128) + 128, 0, 255);
    data[i + 2] = clamp(factor * (data[i + 2] - 128) + 128, 0, 255);
  }
}

/**
 * Apply saturation adjustment
 */
function applySaturation(data: Uint8ClampedArray, saturation: number): void {
  const sat = (saturation + 100) / 100;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = clamp(gray + sat * (data[i] - gray), 0, 255);
    data[i + 1] = clamp(gray + sat * (data[i + 1] - gray), 0, 255);
    data[i + 2] = clamp(gray + sat * (data[i + 2] - gray), 0, 255);
  }
}

/**
 * Apply hue adjustment
 */
function applyHue(data: Uint8ClampedArray, hue: number): void {
  const angle = (hue * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Convert to HSL-like rotation
    const matrix = [
      0.213 + cos * 0.787 - sin * 0.213,
      0.715 - cos * 0.715 - sin * 0.715,
      0.072 - cos * 0.072 + sin * 0.928,
      0.213 - cos * 0.213 + sin * 0.143,
      0.715 + cos * 0.285 + sin * 0.14,
      0.072 - cos * 0.072 - sin * 0.283,
      0.213 - cos * 0.213 - sin * 0.787,
      0.715 - cos * 0.715 + sin * 0.715,
      0.072 + cos * 0.928 + sin * 0.072,
    ];

    data[i] = clamp(r * matrix[0] + g * matrix[1] + b * matrix[2], 0, 255);
    data[i + 1] = clamp(r * matrix[3] + g * matrix[4] + b * matrix[5], 0, 255);
    data[i + 2] = clamp(r * matrix[6] + g * matrix[7] + b * matrix[8], 0, 255);
  }
}

/**
 * Apply Gaussian blur
 */
function applyGaussianBlur(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): Uint8ClampedArray {
  if (radius <= 0) return data;

  const kernelSize = Math.ceil(radius * 2) | 1;
  const kernel = createGaussianKernel(kernelSize, radius);
  const result = new Uint8ClampedArray(data.length);

  // Horizontal pass
  const temp = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      let weightSum = 0;

      for (let k = 0; k < kernelSize; k++) {
        const kx = x + k - Math.floor(kernelSize / 2);
        if (kx >= 0 && kx < width) {
          const idx = (y * width + kx) * 4;
          const weight = kernel[k];
          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
          a += data[idx + 3] * weight;
          weightSum += weight;
        }
      }

      const outIdx = (y * width + x) * 4;
      temp[outIdx] = r / weightSum;
      temp[outIdx + 1] = g / weightSum;
      temp[outIdx + 2] = b / weightSum;
      temp[outIdx + 3] = a / weightSum;
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      let weightSum = 0;

      for (let k = 0; k < kernelSize; k++) {
        const ky = y + k - Math.floor(kernelSize / 2);
        if (ky >= 0 && ky < height) {
          const idx = (ky * width + x) * 4;
          const weight = kernel[k];
          r += temp[idx] * weight;
          g += temp[idx + 1] * weight;
          b += temp[idx + 2] * weight;
          a += temp[idx + 3] * weight;
          weightSum += weight;
        }
      }

      const outIdx = (y * width + x) * 4;
      result[outIdx] = r / weightSum;
      result[outIdx + 1] = g / weightSum;
      result[outIdx + 2] = b / weightSum;
      result[outIdx + 3] = a / weightSum;
    }
  }

  return result;
}

/**
 * Create Gaussian kernel
 */
function createGaussianKernel(size: number, sigma: number): number[] {
  const kernel: number[] = [];
  const center = Math.floor(size / 2);
  let sum = 0;

  for (let i = 0; i < size; i++) {
    const x = i - center;
    const value = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel.push(value);
    sum += value;
  }

  // Normalize
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }

  return kernel;
}

/**
 * Apply unsharp mask sharpening
 */
function applyUnsharpMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number,
  radius: number,
  threshold: number
): Uint8ClampedArray {
  const blurred = applyGaussianBlur(data, width, height, radius);
  const result = new Uint8ClampedArray(data.length);
  const factor = amount / 100;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const original = data[i + c];
      const blur = blurred[i + c];
      const diff = original - blur;

      if (Math.abs(diff) > threshold) {
        result[i + c] = clamp(original + diff * factor, 0, 255);
      } else {
        result[i + c] = original;
      }
    }
    result[i + 3] = data[i + 3]; // Alpha
  }

  return result;
}

/**
 * Apply levels adjustment
 */
function applyLevels(
  data: Uint8ClampedArray,
  options: LevelsOptions
): void {
  const { inputBlack, inputWhite, inputGamma, outputBlack, outputWhite, channel } = options;
  const inputRange = inputWhite - inputBlack;
  const outputRange = outputWhite - outputBlack;

  // Create lookup table
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let value = (i - inputBlack) / inputRange;
    value = Math.max(0, Math.min(1, value));
    value = Math.pow(value, 1 / inputGamma);
    value = value * outputRange + outputBlack;
    lut[i] = clamp(Math.round(value), 0, 255);
  }

  const channels = channel === 'rgb' ? [0, 1, 2] : [{ r: 0, g: 1, b: 2 }[channel]!];

  for (let i = 0; i < data.length; i += 4) {
    for (const c of channels) {
      data[i + c] = lut[data[i + c]];
    }
  }
}

/**
 * Interpolate curve points
 */
function interpolateCurve(points: CurvePoint[]): Uint8Array {
  const lut = new Uint8Array(256);

  if (points.length < 2) {
    for (let i = 0; i < 256; i++) {
      lut[i] = i;
    }
    return lut;
  }

  // Sort points by x
  const sorted = [...points].sort((a, b) => a.x - b.x);

  // Ensure we have endpoints
  if (sorted[0].x > 0) {
    sorted.unshift({ x: 0, y: sorted[0].y });
  }
  if (sorted[sorted.length - 1].x < 255) {
    sorted.push({ x: 255, y: sorted[sorted.length - 1].y });
  }

  // Linear interpolation
  let pointIdx = 0;
  for (let i = 0; i < 256; i++) {
    while (pointIdx < sorted.length - 1 && sorted[pointIdx + 1].x < i) {
      pointIdx++;
    }

    const p1 = sorted[pointIdx];
    const p2 = sorted[Math.min(pointIdx + 1, sorted.length - 1)];

    if (p1.x === p2.x) {
      lut[i] = p2.y;
    } else {
      const t = (i - p1.x) / (p2.x - p1.x);
      lut[i] = clamp(Math.round(p1.y + t * (p2.y - p1.y)), 0, 255);
    }
  }

  return lut;
}

/**
 * Apply curves adjustment
 */
function applyCurves(
  data: Uint8ClampedArray,
  options: CurvesOptions
): void {
  const rgbLut = interpolateCurve(options.rgb);
  const redLut = options.red ? interpolateCurve(options.red) : null;
  const greenLut = options.green ? interpolateCurve(options.green) : null;
  const blueLut = options.blue ? interpolateCurve(options.blue) : null;

  for (let i = 0; i < data.length; i += 4) {
    // Apply RGB curve first
    data[i] = rgbLut[data[i]];
    data[i + 1] = rgbLut[data[i + 1]];
    data[i + 2] = rgbLut[data[i + 2]];

    // Apply individual channel curves
    if (redLut) data[i] = redLut[data[i]];
    if (greenLut) data[i + 1] = greenLut[data[i + 1]];
    if (blueLut) data[i + 2] = blueLut[data[i + 2]];
  }
}

/**
 * RGB to HSL conversion
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h * 360, s * 100, l * 100];
}

/**
 * HSL to RGB conversion
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Apply HSL adjustment
 */
function applyHSL(
  data: Uint8ClampedArray,
  options: HSLOptions
): void {
  const { hue, saturation, lightness, targetHue, hueRange = 30 } = options;

  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);

    // Check if this pixel's hue is in range (if targeting specific hue)
    let factor = 1;
    if (targetHue !== undefined) {
      const hueDiff = Math.min(
        Math.abs(h - targetHue),
        360 - Math.abs(h - targetHue)
      );
      factor = Math.max(0, 1 - hueDiff / hueRange);
    }

    const newH = (h + hue * factor + 360) % 360;
    const newS = clamp(s + saturation * factor, 0, 100);
    const newL = clamp(l + lightness * factor, 0, 100);

    const [r, g, b] = hslToRgb(newH, newS, newL);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

/**
 * Apply median filter for noise reduction
 */
function applyMedianFilter(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data.length);
  const size = radius * 2 + 1;
  const numPixels = size * size;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rValues: number[] = [];
      const gValues: number[] = [];
      const bValues: number[] = [];

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const px = clamp(x + kx, 0, width - 1);
          const py = clamp(y + ky, 0, height - 1);
          const idx = (py * width + px) * 4;

          rValues.push(data[idx]);
          gValues.push(data[idx + 1]);
          bValues.push(data[idx + 2]);
        }
      }

      // Sort and get median
      rValues.sort((a, b) => a - b);
      gValues.sort((a, b) => a - b);
      bValues.sort((a, b) => a - b);

      const midIdx = Math.floor(numPixels / 2);
      const outIdx = (y * width + x) * 4;

      result[outIdx] = rValues[midIdx];
      result[outIdx + 1] = gValues[midIdx];
      result[outIdx + 2] = bValues[midIdx];
      result[outIdx + 3] = data[outIdx + 3];
    }
  }

  return result;
}

/**
 * Apply bilateral filter for edge-preserving smoothing
 */
function applyBilateralFilter(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  spatialSigma: number,
  rangeSigma: number
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data.length);
  const radius = Math.ceil(spatialSigma * 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerIdx = (y * width + x) * 4;
      let rSum = 0, gSum = 0, bSum = 0;
      let weightSum = 0;

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const px = clamp(x + kx, 0, width - 1);
          const py = clamp(y + ky, 0, height - 1);
          const idx = (py * width + px) * 4;

          // Spatial weight
          const spatialDist = Math.sqrt(kx * kx + ky * ky);
          const spatialWeight = Math.exp(-(spatialDist * spatialDist) / (2 * spatialSigma * spatialSigma));

          // Range weight
          const rDiff = data[idx] - data[centerIdx];
          const gDiff = data[idx + 1] - data[centerIdx + 1];
          const bDiff = data[idx + 2] - data[centerIdx + 2];
          const colorDist = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
          const rangeWeight = Math.exp(-(colorDist * colorDist) / (2 * rangeSigma * rangeSigma));

          const weight = spatialWeight * rangeWeight;

          rSum += data[idx] * weight;
          gSum += data[idx + 1] * weight;
          bSum += data[idx + 2] * weight;
          weightSum += weight;
        }
      }

      result[centerIdx] = rSum / weightSum;
      result[centerIdx + 1] = gSum / weightSum;
      result[centerIdx + 2] = bSum / weightSum;
      result[centerIdx + 3] = data[centerIdx + 3];
    }
  }

  return result;
}

/**
 * Calculate histogram
 */
function calculateHistogram(data: Uint8ClampedArray): HistogramData {
  const red = new Array(256).fill(0);
  const green = new Array(256).fill(0);
  const blue = new Array(256).fill(0);
  const luminance = new Array(256).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    red[data[i]]++;
    green[data[i + 1]]++;
    blue[data[i + 2]]++;

    const lum = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    luminance[lum]++;
  }

  return { red, green, blue, luminance };
}

/**
 * Process adjustments
 */
function processAdjustment(id: string, payload: WorkerPayload): void {
  const startTime = performance.now();
  const { imageData, adjustments } = payload;

  if (!imageData || !adjustments) {
    throw new Error('Missing required parameters for adjustment');
  }

  const data = new Uint8ClampedArray(imageData.data);

  if (adjustments.brightness) {
    applyBrightness(data, adjustments.brightness);
  }

  if (adjustments.contrast) {
    applyContrast(data, adjustments.contrast);
  }

  if (adjustments.saturation) {
    applySaturation(data, adjustments.saturation);
  }

  if (adjustments.hue) {
    applyHue(data, adjustments.hue);
  }

  const result = new ImageData(data, imageData.width, imageData.height);

  ctx.postMessage(
    {
      id,
      type: 'success',
      data: result,
      duration: performance.now() - startTime,
    } as WorkerResponse,
    [result.data.buffer]
  );
}

/**
 * Process filter
 */
function processFilter(id: string, payload: WorkerPayload): void {
  const startTime = performance.now();
  const { imageData, filter } = payload;

  if (!imageData || !filter) {
    throw new Error('Missing required parameters for filter');
  }

  const data = new Uint8ClampedArray(imageData.data);

  // Apply filter based on ID
  switch (filter.id) {
    case 'grayscale':
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = gray;
      }
      break;

    case 'sepia':
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        data[i] = clamp(0.393 * r + 0.769 * g + 0.189 * b, 0, 255);
        data[i + 1] = clamp(0.349 * r + 0.686 * g + 0.168 * b, 0, 255);
        data[i + 2] = clamp(0.272 * r + 0.534 * g + 0.131 * b, 0, 255);
      }
      break;

    case 'invert':
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
      break;

    default:
      throw new Error(`Unknown filter: ${filter.id}`);
  }

  const result = new ImageData(data, imageData.width, imageData.height);

  ctx.postMessage(
    {
      id,
      type: 'success',
      data: result,
      duration: performance.now() - startTime,
    } as WorkerResponse,
    [result.data.buffer]
  );
}

/**
 * Process transform
 */
function processTransform(id: string, payload: WorkerPayload): void {
  const startTime = performance.now();
  const { imageData, transform } = payload;

  if (!imageData || !transform) {
    throw new Error('Missing required parameters for transform');
  }

  let width = imageData.width;
  let height = imageData.height;
  let data = new Uint8ClampedArray(imageData.data);

  // Handle rotation (90 degree increments)
  if (transform.rotate) {
    const angle = ((transform.rotate % 360) + 360) % 360;

    if (angle === 90 || angle === 270) {
      [width, height] = [height, width];
    }

    const rotated = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const srcIdx = (y * imageData.width + x) * 4;
        let destX: number, destY: number;

        switch (angle) {
          case 90:
            destX = imageData.height - 1 - y;
            destY = x;
            break;
          case 180:
            destX = imageData.width - 1 - x;
            destY = imageData.height - 1 - y;
            break;
          case 270:
            destX = y;
            destY = imageData.width - 1 - x;
            break;
          default:
            destX = x;
            destY = y;
        }

        const destIdx = (destY * width + destX) * 4;
        rotated[destIdx] = data[srcIdx];
        rotated[destIdx + 1] = data[srcIdx + 1];
        rotated[destIdx + 2] = data[srcIdx + 2];
        rotated[destIdx + 3] = data[srcIdx + 3];
      }
    }

    data = rotated;
  }

  // Handle flip
  if (transform.flipHorizontal) {
    const flipped = new Uint8ClampedArray(data.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const destIdx = (y * width + (width - 1 - x)) * 4;
        flipped[destIdx] = data[srcIdx];
        flipped[destIdx + 1] = data[srcIdx + 1];
        flipped[destIdx + 2] = data[srcIdx + 2];
        flipped[destIdx + 3] = data[srcIdx + 3];
      }
    }
    data = flipped;
  }

  if (transform.flipVertical) {
    const flipped = new Uint8ClampedArray(data.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const destIdx = ((height - 1 - y) * width + x) * 4;
        flipped[destIdx] = data[srcIdx];
        flipped[destIdx + 1] = data[srcIdx + 1];
        flipped[destIdx + 2] = data[srcIdx + 2];
        flipped[destIdx + 3] = data[srcIdx + 3];
      }
    }
    data = flipped;
  }

  const result = new ImageData(data, width, height);

  ctx.postMessage(
    {
      id,
      type: 'success',
      data: result,
      duration: performance.now() - startTime,
    } as WorkerResponse,
    [result.data.buffer]
  );
}

/**
 * Process levels adjustment
 */
function processLevels(id: string, payload: WorkerPayload): void {
  const startTime = performance.now();
  const { imageData, levels } = payload;

  if (!imageData || !levels) {
    throw new Error('Missing required parameters for levels');
  }

  const data = new Uint8ClampedArray(imageData.data);
  applyLevels(data, levels);

  const result = new ImageData(data, imageData.width, imageData.height);

  ctx.postMessage(
    {
      id,
      type: 'success',
      data: result,
      duration: performance.now() - startTime,
    } as WorkerResponse,
    [result.data.buffer]
  );
}

/**
 * Process curves adjustment
 */
function processCurves(id: string, payload: WorkerPayload): void {
  const startTime = performance.now();
  const { imageData, curves } = payload;

  if (!imageData || !curves) {
    throw new Error('Missing required parameters for curves');
  }

  const data = new Uint8ClampedArray(imageData.data);
  applyCurves(data, curves);

  const result = new ImageData(data, imageData.width, imageData.height);

  ctx.postMessage(
    {
      id,
      type: 'success',
      data: result,
      duration: performance.now() - startTime,
    } as WorkerResponse,
    [result.data.buffer]
  );
}

/**
 * Process HSL adjustment
 */
function processHSL(id: string, payload: WorkerPayload): void {
  const startTime = performance.now();
  const { imageData, hsl } = payload;

  if (!imageData || !hsl) {
    throw new Error('Missing required parameters for HSL');
  }

  const data = new Uint8ClampedArray(imageData.data);
  applyHSL(data, hsl);

  const result = new ImageData(data, imageData.width, imageData.height);

  ctx.postMessage(
    {
      id,
      type: 'success',
      data: result,
      duration: performance.now() - startTime,
    } as WorkerResponse,
    [result.data.buffer]
  );
}

/**
 * Process noise reduction
 */
function processNoiseReduction(id: string, payload: WorkerPayload): void {
  const startTime = performance.now();
  const { imageData, noiseReduction } = payload;

  if (!imageData || !noiseReduction) {
    throw new Error('Missing required parameters for noise reduction');
  }

  const { strength, method, preserveDetail } = noiseReduction;
  const radius = Math.ceil(strength / 20);
  let data: Uint8ClampedArray;

  switch (method) {
    case 'median':
      data = applyMedianFilter(imageData.data, imageData.width, imageData.height, radius);
      break;
    case 'bilateral':
      data = applyBilateralFilter(
        imageData.data,
        imageData.width,
        imageData.height,
        radius,
        strength * 2.55
      );
      break;
    case 'gaussian':
    default:
      // Gaussian blur for noise reduction
      data = applyGaussianBlur(
        imageData.data,
        imageData.width,
        imageData.height,
        radius
      );
  }

  // Blend with original based on preserveDetail
  if (preserveDetail > 0) {
    const blend = preserveDetail / 100;
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.round(data[i] * (1 - blend) + imageData.data[i] * blend);
    }
  }

  const result = new ImageData(data as Uint8ClampedArray<ArrayBuffer>, imageData.width, imageData.height);

  ctx.postMessage(
    {
      id,
      type: 'success',
      data: result,
      duration: performance.now() - startTime,
    } as WorkerResponse,
    [result.data.buffer]
  );
}

/**
 * Process sharpening
 */
function processSharpen(id: string, payload: WorkerPayload): void {
  const startTime = performance.now();
  const { imageData, sharpen } = payload;

  if (!imageData || !sharpen) {
    throw new Error('Missing required parameters for sharpen');
  }

  const { amount, radius, threshold } = sharpen;
  const data = applyUnsharpMask(
    imageData.data,
    imageData.width,
    imageData.height,
    amount,
    radius,
    threshold
  );

  const result = new ImageData(data as Uint8ClampedArray<ArrayBuffer>, imageData.width, imageData.height);

  ctx.postMessage(
    {
      id,
      type: 'success',
      data: result,
      duration: performance.now() - startTime,
    } as WorkerResponse,
    [result.data.buffer]
  );
}

/**
 * Process blur
 */
function processBlur(id: string, payload: WorkerPayload): void {
  const startTime = performance.now();
  const { imageData, blur } = payload;

  if (!imageData || !blur) {
    throw new Error('Missing required parameters for blur');
  }

  const data = applyGaussianBlur(
    imageData.data,
    imageData.width,
    imageData.height,
    blur.radius
  );

  const result = new ImageData(data as Uint8ClampedArray<ArrayBuffer>, imageData.width, imageData.height);

  ctx.postMessage(
    {
      id,
      type: 'success',
      data: result,
      duration: performance.now() - startTime,
    } as WorkerResponse,
    [result.data.buffer]
  );
}

/**
 * Process histogram calculation
 */
function processHistogram(id: string, payload: WorkerPayload): void {
  const startTime = performance.now();
  const { imageData } = payload;

  if (!imageData) {
    throw new Error('Missing required parameters for histogram');
  }

  const histogram = calculateHistogram(imageData.data);

  ctx.postMessage({
    id,
    type: 'success',
    data: histogram,
    duration: performance.now() - startTime,
  } as WorkerResponse);
}

/**
 * Main message handler
 */
ctx.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = e.data;

  try {
    switch (type) {
      case 'adjust':
        processAdjustment(id, payload);
        break;
      case 'filter':
        processFilter(id, payload);
        break;
      case 'transform':
        processTransform(id, payload);
        break;
      case 'levels':
        processLevels(id, payload);
        break;
      case 'curves':
        processCurves(id, payload);
        break;
      case 'hsl':
        processHSL(id, payload);
        break;
      case 'noise-reduction':
        processNoiseReduction(id, payload);
        break;
      case 'sharpen':
        processSharpen(id, payload);
        break;
      case 'blur':
        processBlur(id, payload);
        break;
      case 'histogram':
        processHistogram(id, payload);
        break;
      default:
        throw new Error(`Unknown worker message type: ${type}`);
    }
  } catch (error) {
    ctx.postMessage({
      id,
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as WorkerResponse);
  }
};

export {};
