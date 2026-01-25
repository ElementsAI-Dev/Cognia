/**
 * Noise Reduction & Smart Sharpen
 * Advanced noise reduction and sharpening algorithms
 */

export interface NoiseReductionOptions {
  strength: number; // 0-100
  preserveDetail: number; // 0-100
  method: 'median' | 'bilateral' | 'gaussian';
}

export interface SharpenOptions {
  amount: number; // 0-200
  radius: number; // 0.1-10
  threshold: number; // 0-255
  method: 'unsharp-mask' | 'high-pass' | 'laplacian';
}

export const DEFAULT_NOISE_REDUCTION: NoiseReductionOptions = {
  strength: 50,
  preserveDetail: 50,
  method: 'bilateral',
};

export const DEFAULT_SHARPEN: SharpenOptions = {
  amount: 100,
  radius: 1,
  threshold: 0,
  method: 'unsharp-mask',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Apply median filter for noise reduction
 */
function applyMedianFilter(imageData: ImageData, radius: number): ImageData {
  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        const values: number[] = [];

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = clamp(y + dy, 0, height - 1);
            const nx = clamp(x + dx, 0, width - 1);
            values.push(data[(ny * width + nx) * 4 + c]);
          }
        }

        values.sort((a, b) => a - b);
        result[idx + c] = values[Math.floor(values.length / 2)];
      }

      result[idx + 3] = data[idx + 3];
    }
  }

  return new ImageData(result, width, height);
}

/**
 * Apply bilateral filter for edge-preserving noise reduction
 */
function applyBilateralFilter(
  imageData: ImageData,
  spatialSigma: number,
  rangeSigma: number
): ImageData {
  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data.length);
  const radius = Math.ceil(spatialSigma * 2);

  const spatialGaussian = (d: number) =>
    Math.exp(-(d * d) / (2 * spatialSigma * spatialSigma));
  const rangeGaussian = (d: number) =>
    Math.exp(-(d * d) / (2 * rangeSigma * rangeSigma));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const centerR = data[idx];
      const centerG = data[idx + 1];
      const centerB = data[idx + 2];

      let sumR = 0, sumG = 0, sumB = 0, sumWeight = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = clamp(y + dy, 0, height - 1);
          const nx = clamp(x + dx, 0, width - 1);
          const nidx = (ny * width + nx) * 4;

          const spatialDist = Math.sqrt(dx * dx + dy * dy);
          const colorDist = Math.sqrt(
            Math.pow(data[nidx] - centerR, 2) +
            Math.pow(data[nidx + 1] - centerG, 2) +
            Math.pow(data[nidx + 2] - centerB, 2)
          );

          const weight = spatialGaussian(spatialDist) * rangeGaussian(colorDist);

          sumR += data[nidx] * weight;
          sumG += data[nidx + 1] * weight;
          sumB += data[nidx + 2] * weight;
          sumWeight += weight;
        }
      }

      result[idx] = Math.round(sumR / sumWeight);
      result[idx + 1] = Math.round(sumG / sumWeight);
      result[idx + 2] = Math.round(sumB / sumWeight);
      result[idx + 3] = data[idx + 3];
    }
  }

  return new ImageData(result, width, height);
}

/**
 * Apply Gaussian blur
 */
function applyGaussianBlur(imageData: ImageData, sigma: number): ImageData {
  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data.length);
  const radius = Math.ceil(sigma * 3);

  // Create 1D Gaussian kernel
  const kernel: number[] = [];
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const value = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(value);
    sum += value;
  }
  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= sum;
  }

  // Horizontal pass
  const temp = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let r = 0, g = 0, b = 0;

      for (let k = -radius; k <= radius; k++) {
        const nx = clamp(x + k, 0, width - 1);
        const nidx = (y * width + nx) * 4;
        const weight = kernel[k + radius];

        r += data[nidx] * weight;
        g += data[nidx + 1] * weight;
        b += data[nidx + 2] * weight;
      }

      temp[idx] = Math.round(r);
      temp[idx + 1] = Math.round(g);
      temp[idx + 2] = Math.round(b);
      temp[idx + 3] = data[idx + 3];
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let r = 0, g = 0, b = 0;

      for (let k = -radius; k <= radius; k++) {
        const ny = clamp(y + k, 0, height - 1);
        const nidx = (ny * width + x) * 4;
        const weight = kernel[k + radius];

        r += temp[nidx] * weight;
        g += temp[nidx + 1] * weight;
        b += temp[nidx + 2] * weight;
      }

      result[idx] = Math.round(r);
      result[idx + 1] = Math.round(g);
      result[idx + 2] = Math.round(b);
      result[idx + 3] = temp[idx + 3];
    }
  }

  return new ImageData(result, width, height);
}

/**
 * Apply noise reduction
 */
export function applyNoiseReduction(
  imageData: ImageData,
  options: NoiseReductionOptions
): ImageData {
  const { strength, preserveDetail, method } = options;

  const normalizedStrength = strength / 100;
  const spatialSigma = 1 + normalizedStrength * 4;
  const rangeSigma = 10 + (100 - preserveDetail);

  switch (method) {
    case 'median': {
      const radius = Math.max(1, Math.round(normalizedStrength * 3));
      return applyMedianFilter(imageData, radius);
    }

    case 'bilateral':
      return applyBilateralFilter(imageData, spatialSigma, rangeSigma);

    case 'gaussian': {
      const sigma = 0.5 + normalizedStrength * 2;
      return applyGaussianBlur(imageData, sigma);
    }

    default:
      return imageData;
  }
}

/**
 * Apply unsharp mask sharpening
 */
function applyUnsharpMask(
  imageData: ImageData,
  amount: number,
  radius: number,
  threshold: number
): ImageData {
  const blurred = applyGaussianBlur(imageData, radius);
  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data.length);
  const factor = amount / 100;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const original = data[i + c];
      const blur = blurred.data[i + c];
      const diff = original - blur;

      if (Math.abs(diff) >= threshold) {
        result[i + c] = clamp(original + diff * factor, 0, 255);
      } else {
        result[i + c] = original;
      }
    }
    result[i + 3] = data[i + 3];
  }

  return new ImageData(result, width, height);
}

/**
 * Apply high-pass sharpening
 */
function applyHighPassSharpen(
  imageData: ImageData,
  amount: number,
  radius: number
): ImageData {
  const blurred = applyGaussianBlur(imageData, radius);
  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data.length);
  const factor = amount / 100;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const highPass = data[i + c] - blurred.data[i + c] + 128;
      const overlay = highPass < 128
        ? (2 * data[i + c] * highPass) / 255
        : 255 - (2 * (255 - data[i + c]) * (255 - highPass)) / 255;

      result[i + c] = clamp(
        data[i + c] + (overlay - data[i + c]) * factor,
        0,
        255
      );
    }
    result[i + 3] = data[i + 3];
  }

  return new ImageData(result, width, height);
}

/**
 * Apply Laplacian sharpening
 */
function applyLaplacianSharpen(imageData: ImageData, amount: number): ImageData {
  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data.length);
  const factor = amount / 100;

  // Laplacian kernel: [0, -1, 0], [-1, 4, -1], [0, -1, 0]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        const center = data[idx + c] * 4;
        let neighbors = 0;

        if (y > 0) neighbors += data[((y - 1) * width + x) * 4 + c];
        if (y < height - 1) neighbors += data[((y + 1) * width + x) * 4 + c];
        if (x > 0) neighbors += data[(y * width + (x - 1)) * 4 + c];
        if (x < width - 1) neighbors += data[(y * width + (x + 1)) * 4 + c];

        const laplacian = center - neighbors;
        result[idx + c] = clamp(data[idx + c] + laplacian * factor, 0, 255);
      }

      result[idx + 3] = data[idx + 3];
    }
  }

  return new ImageData(result, width, height);
}

/**
 * Apply smart sharpen
 */
export function applySharpen(
  imageData: ImageData,
  options: SharpenOptions
): ImageData {
  const { amount, radius, threshold, method } = options;

  switch (method) {
    case 'unsharp-mask':
      return applyUnsharpMask(imageData, amount, radius, threshold);

    case 'high-pass':
      return applyHighPassSharpen(imageData, amount, radius);

    case 'laplacian':
      return applyLaplacianSharpen(imageData, amount);

    default:
      return imageData;
  }
}

/**
 * Apply clarity (local contrast enhancement)
 */
export function applyClarity(imageData: ImageData, amount: number): ImageData {
  // Clarity is high-pass with larger radius applied to midtones
  const blurred = applyGaussianBlur(imageData, 20);
  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data.length);
  const factor = amount / 100;

  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    
    // Midtone weight: reduces effect on shadows and highlights
    const midtoneWeight = 1 - Math.abs(lum - 128) / 128;

    for (let c = 0; c < 3; c++) {
      const diff = data[i + c] - blurred.data[i + c];
      result[i + c] = clamp(
        data[i + c] + diff * factor * midtoneWeight,
        0,
        255
      );
    }
    result[i + 3] = data[i + 3];
  }

  return new ImageData(result, width, height);
}

/**
 * Apply dehaze effect
 */
export function applyDehaze(imageData: ImageData, amount: number): ImageData {
  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data.length);
  const factor = amount / 100;

  // Find atmospheric light (brightest pixel in image)
  let maxBrightness = 0;
  let atmosR = 255, atmosG = 255, atmosB = 255;

  for (let i = 0; i < data.length; i += 4) {
    const brightness = data[i] + data[i + 1] + data[i + 2];
    if (brightness > maxBrightness) {
      maxBrightness = brightness;
      atmosR = data[i];
      atmosG = data[i + 1];
      atmosB = data[i + 2];
    }
  }

  // Apply dehaze
  for (let i = 0; i < data.length; i += 4) {
    const t = 1 - factor * 0.9; // Transmission

    result[i] = clamp((data[i] - atmosR * (1 - t)) / t, 0, 255);
    result[i + 1] = clamp((data[i + 1] - atmosG * (1 - t)) / t, 0, 255);
    result[i + 2] = clamp((data[i + 2] - atmosB * (1 - t)) / t, 0, 255);
    result[i + 3] = data[i + 3];
  }

  return new ImageData(result, width, height);
}

export default applyNoiseReduction;
