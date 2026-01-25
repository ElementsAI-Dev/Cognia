/**
 * Levels Adjustment
 * Input/output levels and gamma correction for image editing
 */

export interface LevelsOptions {
  inputBlack: number; // 0-255
  inputWhite: number; // 0-255
  inputGamma: number; // 0.1-10
  outputBlack: number; // 0-255
  outputWhite: number; // 0-255
  channel: 'rgb' | 'r' | 'g' | 'b';
}

export const DEFAULT_LEVELS: LevelsOptions = {
  inputBlack: 0,
  inputWhite: 255,
  inputGamma: 1.0,
  outputBlack: 0,
  outputWhite: 255,
  channel: 'rgb',
};

/**
 * Calculate histogram from ImageData
 */
export function calculateHistogram(imageData: ImageData): {
  red: number[];
  green: number[];
  blue: number[];
  luminance: number[];
} {
  const { data } = imageData;
  const red = new Array(256).fill(0);
  const green = new Array(256).fill(0);
  const blue = new Array(256).fill(0);
  const luminance = new Array(256).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    red[data[i]]++;
    green[data[i + 1]]++;
    blue[data[i + 2]]++;

    const lum = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    luminance[Math.min(255, Math.max(0, lum))]++;
  }

  return { red, green, blue, luminance };
}

/**
 * Auto-detect levels from histogram
 */
export function autoLevels(histogram: number[], clipPercent = 0.1): { black: number; white: number } {
  const total = histogram.reduce((sum, val) => sum + val, 0);
  const clipCount = Math.floor(total * (clipPercent / 100));

  let black = 0;
  let count = 0;
  for (let i = 0; i < 256; i++) {
    count += histogram[i];
    if (count > clipCount) {
      black = i;
      break;
    }
  }

  let white = 255;
  count = 0;
  for (let i = 255; i >= 0; i--) {
    count += histogram[i];
    if (count > clipCount) {
      white = i;
      break;
    }
  }

  return { black, white };
}

/**
 * Create lookup table for levels adjustment
 */
export function createLevelsLUT(options: LevelsOptions): Uint8Array {
  const { inputBlack, inputWhite, inputGamma, outputBlack, outputWhite } = options;
  const lut = new Uint8Array(256);
  const inputRange = inputWhite - inputBlack;
  const outputRange = outputWhite - outputBlack;

  for (let i = 0; i < 256; i++) {
    let value = (i - inputBlack) / inputRange;
    value = Math.max(0, Math.min(1, value));
    value = Math.pow(value, 1 / inputGamma);
    value = value * outputRange + outputBlack;
    lut[i] = Math.round(Math.max(0, Math.min(255, value)));
  }

  return lut;
}

/**
 * Apply levels adjustment to ImageData
 */
export function applyLevels(imageData: ImageData, options: LevelsOptions): ImageData {
  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data.length);
  const lut = createLevelsLUT(options);
  const channels = options.channel === 'rgb' ? [0, 1, 2] : [{ r: 0, g: 1, b: 2 }[options.channel]!];

  for (let i = 0; i < data.length; i += 4) {
    // Apply LUT to selected channels
    for (let c = 0; c < 3; c++) {
      if (channels.includes(c)) {
        result[i + c] = lut[data[i + c]];
      } else {
        result[i + c] = data[i + c];
      }
    }
    // Preserve alpha
    result[i + 3] = data[i + 3];
  }

  return new ImageData(result, width, height);
}

/**
 * Apply auto-levels adjustment
 */
export function applyAutoLevels(imageData: ImageData, clipPercent = 0.1): ImageData {
  const histogram = calculateHistogram(imageData);
  const { black, white } = autoLevels(histogram.luminance, clipPercent);

  return applyLevels(imageData, {
    ...DEFAULT_LEVELS,
    inputBlack: black,
    inputWhite: white,
  });
}

/**
 * Apply auto-contrast (stretch histogram)
 */
export function applyAutoContrast(imageData: ImageData): ImageData {
  const histogram = calculateHistogram(imageData);

  // Find min/max for each channel
  const findRange = (hist: number[]) => {
    let min = 0, max = 255;
    for (let i = 0; i < 256; i++) {
      if (hist[i] > 0) { min = i; break; }
    }
    for (let i = 255; i >= 0; i--) {
      if (hist[i] > 0) { max = i; break; }
    }
    return { min, max };
  };

  const rRange = findRange(histogram.red);
  const gRange = findRange(histogram.green);
  const bRange = findRange(histogram.blue);

  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data.length);

  const stretch = (value: number, min: number, max: number) => {
    if (max === min) return value;
    return Math.round(((value - min) / (max - min)) * 255);
  };

  for (let i = 0; i < data.length; i += 4) {
    result[i] = stretch(data[i], rRange.min, rRange.max);
    result[i + 1] = stretch(data[i + 1], gRange.min, gRange.max);
    result[i + 2] = stretch(data[i + 2], bRange.min, bRange.max);
    result[i + 3] = data[i + 3];
  }

  return new ImageData(result, width, height);
}

export default applyLevels;
