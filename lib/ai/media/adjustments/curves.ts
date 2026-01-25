/**
 * Curves Adjustment
 * Tone curve editing for precise tonal control
 */

export interface CurvePoint {
  x: number; // 0-255 input value
  y: number; // 0-255 output value
}

export interface CurvesOptions {
  rgb: CurvePoint[];
  red?: CurvePoint[];
  green?: CurvePoint[];
  blue?: CurvePoint[];
}

export const DEFAULT_CURVE: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 255, y: 255 },
];

export const DEFAULT_CURVES: CurvesOptions = {
  rgb: [...DEFAULT_CURVE],
  red: undefined,
  green: undefined,
  blue: undefined,
};

/**
 * Preset curves
 */
export const CURVE_PRESETS = {
  linear: [
    { x: 0, y: 0 },
    { x: 255, y: 255 },
  ],
  contrast: [
    { x: 0, y: 0 },
    { x: 64, y: 48 },
    { x: 192, y: 208 },
    { x: 255, y: 255 },
  ],
  lighten: [
    { x: 0, y: 0 },
    { x: 128, y: 160 },
    { x: 255, y: 255 },
  ],
  darken: [
    { x: 0, y: 0 },
    { x: 128, y: 96 },
    { x: 255, y: 255 },
  ],
  fade: [
    { x: 0, y: 32 },
    { x: 255, y: 224 },
  ],
  crossProcess: [
    { x: 0, y: 0 },
    { x: 64, y: 48 },
    { x: 128, y: 140 },
    { x: 192, y: 200 },
    { x: 255, y: 255 },
  ],
  sCurve: [
    { x: 0, y: 0 },
    { x: 64, y: 50 },
    { x: 128, y: 128 },
    { x: 192, y: 206 },
    { x: 255, y: 255 },
  ],
  negativeCurve: [
    { x: 0, y: 255 },
    { x: 255, y: 0 },
  ],
} as const;

/**
 * Sort curve points by x coordinate
 */
export function sortCurvePoints(points: CurvePoint[]): CurvePoint[] {
  return [...points].sort((a, b) => a.x - b.x);
}

/**
 * Interpolate between curve points using cubic spline
 */
function cubicInterpolate(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number
): number {
  const a = -0.5 * p0 + 1.5 * p1 - 1.5 * p2 + 0.5 * p3;
  const b = p0 - 2.5 * p1 + 2 * p2 - 0.5 * p3;
  const c = -0.5 * p0 + 0.5 * p2;
  const d = p1;

  return a * t * t * t + b * t * t + c * t + d;
}

/**
 * Create lookup table from curve points using cubic spline interpolation
 */
export function createCurveLUT(points: CurvePoint[]): Uint8Array {
  const lut = new Uint8Array(256);
  const sorted = sortCurvePoints(points);

  if (sorted.length < 2) {
    for (let i = 0; i < 256; i++) {
      lut[i] = i;
    }
    return lut;
  }

  // Ensure endpoints
  if (sorted[0].x > 0) {
    sorted.unshift({ x: 0, y: sorted[0].y });
  }
  if (sorted[sorted.length - 1].x < 255) {
    sorted.push({ x: 255, y: sorted[sorted.length - 1].y });
  }

  // Create extended points for cubic interpolation
  const extended = [
    { x: sorted[0].x - (sorted[1].x - sorted[0].x), y: sorted[0].y },
    ...sorted,
    {
      x: sorted[sorted.length - 1].x + (sorted[sorted.length - 1].x - sorted[sorted.length - 2].x),
      y: sorted[sorted.length - 1].y,
    },
  ];

  // Interpolate
  for (let i = 0; i < 256; i++) {
    // Find segment
    let segIdx = 1;
    while (segIdx < extended.length - 2 && extended[segIdx + 1].x < i) {
      segIdx++;
    }

    const p0 = extended[segIdx - 1];
    const p1 = extended[segIdx];
    const p2 = extended[segIdx + 1];
    const p3 = extended[segIdx + 2];

    // Calculate t
    const segmentLength = p2.x - p1.x;
    const t = segmentLength > 0 ? (i - p1.x) / segmentLength : 0;

    // Cubic interpolation
    const value = cubicInterpolate(p0.y, p1.y, p2.y, p3.y, t);
    lut[i] = Math.round(Math.max(0, Math.min(255, value)));
  }

  return lut;
}

/**
 * Create lookup table using linear interpolation (faster)
 */
export function createCurveLUTLinear(points: CurvePoint[]): Uint8Array {
  const lut = new Uint8Array(256);
  const sorted = sortCurvePoints(points);

  if (sorted.length < 2) {
    for (let i = 0; i < 256; i++) {
      lut[i] = i;
    }
    return lut;
  }

  // Ensure endpoints
  if (sorted[0].x > 0) {
    sorted.unshift({ x: 0, y: sorted[0].y });
  }
  if (sorted[sorted.length - 1].x < 255) {
    sorted.push({ x: 255, y: sorted[sorted.length - 1].y });
  }

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
      lut[i] = Math.round(p1.y + t * (p2.y - p1.y));
    }
  }

  return lut;
}

/**
 * Apply curves adjustment to ImageData
 */
export function applyCurves(
  imageData: ImageData,
  options: CurvesOptions,
  useCubic = true
): ImageData {
  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data.length);

  const createLUT = useCubic ? createCurveLUT : createCurveLUTLinear;

  const rgbLut = createLUT(options.rgb);
  const redLut = options.red ? createLUT(options.red) : null;
  const greenLut = options.green ? createLUT(options.green) : null;
  const blueLut = options.blue ? createLUT(options.blue) : null;

  for (let i = 0; i < data.length; i += 4) {
    // Apply RGB curve first
    let r = rgbLut[data[i]];
    let g = rgbLut[data[i + 1]];
    let b = rgbLut[data[i + 2]];

    // Apply individual channel curves
    if (redLut) r = redLut[r];
    if (greenLut) g = greenLut[g];
    if (blueLut) b = blueLut[b];

    result[i] = r;
    result[i + 1] = g;
    result[i + 2] = b;
    result[i + 3] = data[i + 3];
  }

  return new ImageData(result, width, height);
}

/**
 * Create a curve from a function
 */
export function createCurveFromFunction(
  fn: (x: number) => number,
  numPoints = 17
): CurvePoint[] {
  const points: CurvePoint[] = [];
  for (let i = 0; i < numPoints; i++) {
    const x = Math.round((i / (numPoints - 1)) * 255);
    const y = Math.round(Math.max(0, Math.min(255, fn(x))));
    points.push({ x, y });
  }
  return points;
}

/**
 * Create contrast curve
 */
export function createContrastCurve(contrast: number): CurvePoint[] {
  // contrast: -100 to 100
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  return createCurveFromFunction((x) => factor * (x - 128) + 128);
}

/**
 * Create brightness curve
 */
export function createBrightnessCurve(brightness: number): CurvePoint[] {
  // brightness: -100 to 100
  const adjustment = brightness * 2.55;
  return createCurveFromFunction((x) => x + adjustment);
}

/**
 * Combine multiple curves
 */
export function combineCurves(...curves: CurvePoint[][]): CurvePoint[] {
  const luts = curves.map((curve) => createCurveLUT(curve));

  // Compose LUTs
  const combinedLut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let value = i;
    for (const lut of luts) {
      value = lut[value];
    }
    combinedLut[i] = value;
  }

  // Convert back to points (simplified)
  return [
    { x: 0, y: combinedLut[0] },
    { x: 64, y: combinedLut[64] },
    { x: 128, y: combinedLut[128] },
    { x: 192, y: combinedLut[192] },
    { x: 255, y: combinedLut[255] },
  ];
}

export default applyCurves;
