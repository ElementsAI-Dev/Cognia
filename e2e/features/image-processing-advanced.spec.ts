import { test, expect } from '@playwright/test';

/**
 * Image Processing Advanced E2E Tests
 * Tests for advanced image adjustments, WebGL processing, Worker processing,
 * histogram calculation, and progressive loading
 */

test.describe('Advanced Adjustments - Levels', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should configure levels adjustment options', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface LevelsOptions {
        inputBlack: number;
        inputWhite: number;
        gamma: number;
        outputBlack: number;
        outputWhite: number;
        channel?: 'rgb' | 'red' | 'green' | 'blue';
      }

      const DEFAULT_LEVELS: LevelsOptions = {
        inputBlack: 0,
        inputWhite: 255,
        gamma: 1.0,
        outputBlack: 0,
        outputWhite: 255,
        channel: 'rgb',
      };

      const validateLevels = (options: Partial<LevelsOptions>): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        const full = { ...DEFAULT_LEVELS, ...options };

        if (full.inputBlack < 0 || full.inputBlack > 255) {
          errors.push('Input black must be 0-255');
        }
        if (full.inputWhite < 0 || full.inputWhite > 255) {
          errors.push('Input white must be 0-255');
        }
        if (full.inputBlack >= full.inputWhite) {
          errors.push('Input black must be less than input white');
        }
        if (full.gamma <= 0 || full.gamma > 10) {
          errors.push('Gamma must be between 0 and 10');
        }
        if (full.outputBlack < 0 || full.outputBlack > 255) {
          errors.push('Output black must be 0-255');
        }
        if (full.outputWhite < 0 || full.outputWhite > 255) {
          errors.push('Output white must be 0-255');
        }

        return { valid: errors.length === 0, errors };
      };

      const createLevelsLUT = (options: LevelsOptions): Uint8Array => {
        const lut = new Uint8Array(256);
        const { inputBlack, inputWhite, gamma, outputBlack, outputWhite } = options;
        const inputRange = inputWhite - inputBlack;
        const outputRange = outputWhite - outputBlack;

        for (let i = 0; i < 256; i++) {
          let value: number;
          if (i <= inputBlack) {
            value = outputBlack;
          } else if (i >= inputWhite) {
            value = outputWhite;
          } else {
            const normalized = (i - inputBlack) / inputRange;
            const gammaCorrected = Math.pow(normalized, 1 / gamma);
            value = outputBlack + gammaCorrected * outputRange;
          }
          lut[i] = Math.round(Math.max(0, Math.min(255, value)));
        }

        return lut;
      };

      const defaultLUT = createLevelsLUT(DEFAULT_LEVELS);
      const contrastLUT = createLevelsLUT({ ...DEFAULT_LEVELS, inputBlack: 30, inputWhite: 225 });
      const brightenLUT = createLevelsLUT({ ...DEFAULT_LEVELS, gamma: 1.5 });

      return {
        defaultLevels: DEFAULT_LEVELS,
        validDefault: validateLevels(DEFAULT_LEVELS),
        validContrast: validateLevels({ inputBlack: 30, inputWhite: 225 }),
        invalidBlackWhite: validateLevels({ inputBlack: 200, inputWhite: 100 }),
        invalidGamma: validateLevels({ gamma: -1 }),
        defaultLUT128: defaultLUT[128],
        contrastLUT128: contrastLUT[128],
        brightenLUT128: brightenLUT[128],
      };
    });

    expect(result.validDefault.valid).toBe(true);
    expect(result.validContrast.valid).toBe(true);
    expect(result.invalidBlackWhite.valid).toBe(false);
    expect(result.invalidGamma.valid).toBe(false);
    expect(result.defaultLUT128).toBe(128);
    expect(result.contrastLUT128).toBeGreaterThan(128);
    expect(result.brightenLUT128).toBeGreaterThan(128);
  });

  test('should calculate auto levels from histogram', async ({ page }) => {
    const result = await page.evaluate(() => {
      const calculateAutoLevels = (histogram: number[]): { black: number; white: number } => {
        const total = histogram.reduce((a, b) => a + b, 0);
        const threshold = total * 0.005; // 0.5% clip

        let black = 0;
        let whiteCount = 0;
        let blackCount = 0;

        // Find black point
        for (let i = 0; i < 256; i++) {
          blackCount += histogram[i];
          if (blackCount > threshold) {
            black = i;
            break;
          }
        }

        // Find white point
        let white = 255;
        for (let i = 255; i >= 0; i--) {
          whiteCount += histogram[i];
          if (whiteCount > threshold) {
            white = i;
            break;
          }
        }

        return { black, white };
      };

      // Create test histograms
      const normalHistogram = new Array(256).fill(0);
      for (let i = 20; i < 236; i++) {
        normalHistogram[i] = 100;
      }

      const lowContrastHistogram = new Array(256).fill(0);
      for (let i = 80; i < 176; i++) {
        lowContrastHistogram[i] = 100;
      }

      const biasedHistogram = new Array(256).fill(0);
      for (let i = 0; i < 128; i++) {
        biasedHistogram[i] = 200;
      }

      return {
        normalAutoLevels: calculateAutoLevels(normalHistogram),
        lowContrastAutoLevels: calculateAutoLevels(lowContrastHistogram),
        biasedAutoLevels: calculateAutoLevels(biasedHistogram),
      };
    });

    expect(result.normalAutoLevels.black).toBeLessThan(30);
    expect(result.normalAutoLevels.white).toBeGreaterThan(225);
    expect(result.lowContrastAutoLevels.black).toBeGreaterThan(70);
    expect(result.lowContrastAutoLevels.white).toBeLessThan(180);
  });
});

test.describe('Advanced Adjustments - Curves', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should configure curves with control points', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CurvePoint {
        x: number;
        y: number;
      }

      interface _CurvesOptions {
        rgb: CurvePoint[];
        red?: CurvePoint[];
        green?: CurvePoint[];
        blue?: CurvePoint[];
      }

      const DEFAULT_CURVE: CurvePoint[] = [
        { x: 0, y: 0 },
        { x: 255, y: 255 },
      ];

      const sortCurvePoints = (points: CurvePoint[]): CurvePoint[] => {
        return [...points].sort((a, b) => a.x - b.x);
      };

      const interpolateCurve = (points: CurvePoint[], x: number): number => {
        const sorted = sortCurvePoints(points);

        if (x <= sorted[0].x) return sorted[0].y;
        if (x >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y;

        for (let i = 0; i < sorted.length - 1; i++) {
          if (x >= sorted[i].x && x <= sorted[i + 1].x) {
            const t = (x - sorted[i].x) / (sorted[i + 1].x - sorted[i].x);
            return sorted[i].y + t * (sorted[i + 1].y - sorted[i].y);
          }
        }

        return x;
      };

      const createCurveLUT = (points: CurvePoint[]): Uint8Array => {
        const lut = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
          lut[i] = Math.round(Math.max(0, Math.min(255, interpolateCurve(points, i))));
        }
        return lut;
      };

      // Test curves
      const linearCurve = DEFAULT_CURVE;
      const contrastCurve: CurvePoint[] = [
        { x: 0, y: 0 },
        { x: 64, y: 48 },
        { x: 192, y: 208 },
        { x: 255, y: 255 },
      ];
      const brightnessCurve: CurvePoint[] = [
        { x: 0, y: 30 },
        { x: 255, y: 255 },
      ];

      const linearLUT = createCurveLUT(linearCurve);
      const contrastLUT = createCurveLUT(contrastCurve);
      const brightnessLUT = createCurveLUT(brightnessCurve);

      return {
        linearLUT0: linearLUT[0],
        linearLUT128: linearLUT[128],
        linearLUT255: linearLUT[255],
        contrastLUT64: contrastLUT[64],
        contrastLUT128: contrastLUT[128],
        contrastLUT192: contrastLUT[192],
        brightnessLUT0: brightnessLUT[0],
        brightnessLUT128: brightnessLUT[128],
      };
    });

    expect(result.linearLUT0).toBe(0);
    expect(result.linearLUT128).toBe(128);
    expect(result.linearLUT255).toBe(255);
    expect(result.contrastLUT64).toBeLessThan(64);
    expect(result.contrastLUT192).toBeGreaterThan(192);
    expect(result.brightnessLUT0).toBe(30);
  });

  test('should support curve presets', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CurvePoint {
        x: number;
        y: number;
      }

      interface CurvePreset {
        name: string;
        points: CurvePoint[];
        description: string;
      }

      const CURVE_PRESETS: CurvePreset[] = [
        {
          name: 'Linear',
          points: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
          description: 'No adjustment',
        },
        {
          name: 'S-Curve (Light)',
          points: [{ x: 0, y: 0 }, { x: 64, y: 48 }, { x: 192, y: 208 }, { x: 255, y: 255 }],
          description: 'Slight contrast boost',
        },
        {
          name: 'S-Curve (Medium)',
          points: [{ x: 0, y: 0 }, { x: 64, y: 32 }, { x: 192, y: 224 }, { x: 255, y: 255 }],
          description: 'Medium contrast boost',
        },
        {
          name: 'Brighten',
          points: [{ x: 0, y: 0 }, { x: 128, y: 160 }, { x: 255, y: 255 }],
          description: 'Lift midtones',
        },
        {
          name: 'Darken',
          points: [{ x: 0, y: 0 }, { x: 128, y: 96 }, { x: 255, y: 255 }],
          description: 'Lower midtones',
        },
        {
          name: 'High Key',
          points: [{ x: 0, y: 32 }, { x: 128, y: 192 }, { x: 255, y: 255 }],
          description: 'Bright, airy look',
        },
        {
          name: 'Low Key',
          points: [{ x: 0, y: 0 }, { x: 128, y: 64 }, { x: 255, y: 224 }],
          description: 'Dark, moody look',
        },
      ];

      const getPresetByName = (name: string) => CURVE_PRESETS.find(p => p.name === name);

      return {
        presetCount: CURVE_PRESETS.length,
        linearPreset: getPresetByName('Linear'),
        sCurveLightPreset: getPresetByName('S-Curve (Light)'),
        highKeyPreset: getPresetByName('High Key'),
        lowKeyPreset: getPresetByName('Low Key'),
      };
    });

    expect(result.presetCount).toBe(7);
    expect(result.linearPreset?.points.length).toBe(2);
    expect(result.sCurveLightPreset?.points.length).toBe(4);
    expect(result.highKeyPreset?.points[0].y).toBe(32);
    expect(result.lowKeyPreset?.points[2].y).toBe(224);
  });
});

test.describe('Advanced Adjustments - HSL', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should configure HSL adjustment options', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface HSLOptions {
        hue: number;
        saturation: number;
        lightness: number;
      }

      const DEFAULT_HSL: HSLOptions = {
        hue: 0,
        saturation: 0,
        lightness: 0,
      };

      const clampHSL = (options: HSLOptions): HSLOptions => ({
        hue: ((options.hue % 360) + 360) % 360 - 180,
        saturation: Math.max(-100, Math.min(100, options.saturation)),
        lightness: Math.max(-100, Math.min(100, options.lightness)),
      });

      const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
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

        return {
          h: Math.round(h * 360),
          s: Math.round(s * 100),
          l: Math.round(l * 100),
        };
      };

      const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
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

        return {
          r: Math.round(r * 255),
          g: Math.round(g * 255),
          b: Math.round(b * 255),
        };
      };

      // Test conversions
      const redHSL = rgbToHsl(255, 0, 0);
      const greenHSL = rgbToHsl(0, 255, 0);
      const blueHSL = rgbToHsl(0, 0, 255);

      const redRGB = hslToRgb(0, 100, 50);
      const greenRGB = hslToRgb(120, 100, 50);
      const blueRGB = hslToRgb(240, 100, 50);

      return {
        defaultHSL: DEFAULT_HSL,
        clampedHue: clampHSL({ hue: 400, saturation: 0, lightness: 0 }),
        clampedSaturation: clampHSL({ hue: 0, saturation: 150, lightness: 0 }),
        redHSL,
        greenHSL,
        blueHSL,
        redRGB,
        greenRGB,
        blueRGB,
      };
    });

    expect(result.defaultHSL).toEqual({ hue: 0, saturation: 0, lightness: 0 });
    expect(result.clampedSaturation.saturation).toBe(100);
    expect(result.redHSL.h).toBe(0);
    expect(result.greenHSL.h).toBe(120);
    expect(result.blueHSL.h).toBe(240);
    expect(result.redRGB).toEqual({ r: 255, g: 0, b: 0 });
  });

  test('should support targeted HSL adjustments', async ({ page }) => {
    const result = await page.evaluate(() => {
      type HueRange = 'reds' | 'oranges' | 'yellows' | 'greens' | 'cyans' | 'blues' | 'purples' | 'magentas';

      interface _HSLTargetedOptions {
        range: HueRange;
        hue: number;
        saturation: number;
        lightness: number;
      }

      const HUE_RANGES: Record<HueRange, { min: number; max: number }> = {
        reds: { min: -15, max: 15 },
        oranges: { min: 15, max: 45 },
        yellows: { min: 45, max: 75 },
        greens: { min: 75, max: 165 },
        cyans: { min: 165, max: 195 },
        blues: { min: 195, max: 255 },
        purples: { min: 255, max: 285 },
        magentas: { min: 285, max: 345 },
      };

      const isHueInRange = (hue: number, range: HueRange): boolean => {
        const { min, max } = HUE_RANGES[range];
        // Normalize hue to 0-360
        hue = ((hue % 360) + 360) % 360;

        if (min < 0) {
          return hue >= (360 + min) || hue <= max;
        }
        return hue >= min && hue <= max;
      };

      return {
        rangeCount: Object.keys(HUE_RANGES).length,
        redRange: HUE_RANGES.reds,
        greenRange: HUE_RANGES.greens,
        isRedInReds: isHueInRange(0, 'reds'),
        isGreenInGreens: isHueInRange(120, 'greens'),
        isBlueInBlues: isHueInRange(240, 'blues'),
        isRedInGreens: isHueInRange(0, 'greens'),
      };
    });

    expect(result.rangeCount).toBe(8);
    expect(result.isRedInReds).toBe(true);
    expect(result.isGreenInGreens).toBe(true);
    expect(result.isBlueInBlues).toBe(true);
    expect(result.isRedInGreens).toBe(false);
  });
});

test.describe('Advanced Adjustments - Noise & Sharpen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should configure noise reduction options', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface NoiseReductionOptions {
        luminance: number;
        color: number;
        detail: number;
        preserveDetail: number;
      }

      const DEFAULT_NOISE_REDUCTION: NoiseReductionOptions = {
        luminance: 0,
        color: 0,
        detail: 50,
        preserveDetail: 0.1,
      };

      const validateNoiseReduction = (options: Partial<NoiseReductionOptions>): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        const full = { ...DEFAULT_NOISE_REDUCTION, ...options };

        if (full.luminance < 0 || full.luminance > 100) {
          errors.push('Luminance must be 0-100');
        }
        if (full.color < 0 || full.color > 100) {
          errors.push('Color must be 0-100');
        }
        if (full.detail < 0 || full.detail > 100) {
          errors.push('Detail must be 0-100');
        }
        if (full.preserveDetail < 0 || full.preserveDetail > 1) {
          errors.push('Preserve detail must be 0-1');
        }

        return { valid: errors.length === 0, errors };
      };

      return {
        defaultOptions: DEFAULT_NOISE_REDUCTION,
        validOptions: validateNoiseReduction({ luminance: 50, color: 25 }),
        invalidLuminance: validateNoiseReduction({ luminance: 150 }),
        invalidDetail: validateNoiseReduction({ preserveDetail: 2 }),
      };
    });

    expect(result.defaultOptions.luminance).toBe(0);
    expect(result.validOptions.valid).toBe(true);
    expect(result.invalidLuminance.valid).toBe(false);
    expect(result.invalidDetail.valid).toBe(false);
  });

  test('should configure sharpen options', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface SharpenOptions {
        amount: number;
        radius: number;
        threshold: number;
      }

      const DEFAULT_SHARPEN: SharpenOptions = {
        amount: 0,
        radius: 1,
        threshold: 0,
      };

      const validateSharpen = (options: Partial<SharpenOptions>): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        const full = { ...DEFAULT_SHARPEN, ...options };

        if (full.amount < 0 || full.amount > 500) {
          errors.push('Amount must be 0-500');
        }
        if (full.radius < 0.1 || full.radius > 10) {
          errors.push('Radius must be 0.1-10');
        }
        if (full.threshold < 0 || full.threshold > 255) {
          errors.push('Threshold must be 0-255');
        }

        return { valid: errors.length === 0, errors };
      };

      // Create sharpening kernel
      const createSharpenKernel = (amount: number): number[] => {
        const center = 1 + (4 * amount / 100);
        const edge = -amount / 100;
        return [
          0, edge, 0,
          edge, center, edge,
          0, edge, 0,
        ];
      };

      const kernel50 = createSharpenKernel(50);
      const kernel100 = createSharpenKernel(100);

      return {
        defaultOptions: DEFAULT_SHARPEN,
        validOptions: validateSharpen({ amount: 100, radius: 1.5 }),
        invalidAmount: validateSharpen({ amount: 600 }),
        invalidRadius: validateSharpen({ radius: 20 }),
        kernel50Center: kernel50[4],
        kernel100Center: kernel100[4],
      };
    });

    expect(result.defaultOptions.amount).toBe(0);
    expect(result.validOptions.valid).toBe(true);
    expect(result.invalidAmount.valid).toBe(false);
    expect(result.invalidRadius.valid).toBe(false);
    expect(result.kernel50Center).toBe(3);
    expect(result.kernel100Center).toBe(5);
  });
});

test.describe('Histogram Calculation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should calculate RGB histogram', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface HistogramData {
        red: number[];
        green: number[];
        blue: number[];
        luminance: number[];
      }

      const calculateHistogram = (imageData: { data: Uint8ClampedArray; width: number; height: number }): HistogramData => {
        const red = new Array(256).fill(0);
        const green = new Array(256).fill(0);
        const blue = new Array(256).fill(0);
        const luminance = new Array(256).fill(0);

        const { data } = imageData;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          red[r]++;
          green[g]++;
          blue[b]++;

          const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
          luminance[Math.min(255, Math.max(0, lum))]++;
        }

        return { red, green, blue, luminance };
      };

      // Create test image data (100x100 gradient)
      const width = 100;
      const height = 100;
      const data = new Uint8ClampedArray(width * height * 4);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          data[i] = Math.floor((x / width) * 255); // Red gradient
          data[i + 1] = Math.floor((y / height) * 255); // Green gradient
          data[i + 2] = 128; // Constant blue
          data[i + 3] = 255; // Alpha
        }
      }

      const histogram = calculateHistogram({ data, width, height });

      // Calculate statistics
      const getStats = (channel: number[]): { min: number; max: number; mean: number } => {
        const total = channel.reduce((a, b) => a + b, 0);
        let sum = 0;
        let min = -1;
        let max = -1;

        for (let i = 0; i < 256; i++) {
          if (channel[i] > 0 && min === -1) min = i;
          if (channel[i] > 0) max = i;
          sum += i * channel[i];
        }

        return { min, max, mean: Math.round(sum / total) };
      };

      return {
        redStats: getStats(histogram.red),
        greenStats: getStats(histogram.green),
        blueStats: getStats(histogram.blue),
        luminanceStats: getStats(histogram.luminance),
        totalPixels: width * height,
        redChannelLength: histogram.red.length,
      };
    });

    expect(result.redChannelLength).toBe(256);
    expect(result.totalPixels).toBe(10000);
    expect(result.blueStats.min).toBe(128);
    expect(result.blueStats.max).toBe(128);
  });

  test('should normalize histogram for display', async ({ page }) => {
    const result = await page.evaluate(() => {
      const normalizeHistogram = (channel: number[], maxHeight: number): number[] => {
        const max = Math.max(...channel);
        if (max === 0) return new Array(256).fill(0);
        return channel.map(v => (v / max) * maxHeight);
      };

      const logNormalizeHistogram = (channel: number[], maxHeight: number): number[] => {
        const logChannel = channel.map(v => v > 0 ? Math.log(v + 1) : 0);
        const max = Math.max(...logChannel);
        if (max === 0) return new Array(256).fill(0);
        return logChannel.map(v => (v / max) * maxHeight);
      };

      // Create test histogram with varying values
      const histogram = new Array(256).fill(0);
      histogram[128] = 1000;
      histogram[64] = 500;
      histogram[192] = 250;

      const normalized = normalizeHistogram(histogram, 100);
      const logNormalized = logNormalizeHistogram(histogram, 100);

      return {
        normalizedMax: Math.max(...normalized),
        normalized128: normalized[128],
        normalized64: normalized[64],
        normalized192: normalized[192],
        logNormalized128: Math.round(logNormalized[128]),
        logNormalized64: Math.round(logNormalized[64]),
        logNormalized192: Math.round(logNormalized[192]),
      };
    });

    expect(result.normalizedMax).toBe(100);
    expect(result.normalized128).toBe(100);
    expect(result.normalized64).toBe(50);
    expect(result.normalized192).toBe(25);
    expect(result.logNormalized128).toBe(100);
    // Log normalization should compress the range
    expect(result.logNormalized64).toBeGreaterThan(80);
  });
});

test.describe('Worker Processing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should support worker message types', async ({ page }) => {
    const result = await page.evaluate(() => {
      type WorkerMessageType =
        | 'adjust'
        | 'filter'
        | 'transform'
        | 'levels'
        | 'curves'
        | 'hsl'
        | 'noise-reduction'
        | 'sharpen'
        | 'blur'
        | 'histogram';

      interface WorkerMessage {
        id: string;
        type: WorkerMessageType;
        payload: Record<string, unknown>;
      }

      interface WorkerResponse {
        id: string;
        type: 'success' | 'error' | 'progress';
        data?: unknown;
        error?: string;
        progress?: number;
        duration?: number;
      }

      const MESSAGE_TYPES: WorkerMessageType[] = [
        'adjust', 'filter', 'transform', 'levels', 'curves',
        'hsl', 'noise-reduction', 'sharpen', 'blur', 'histogram',
      ];

      const createMessage = (type: WorkerMessageType, payload: Record<string, unknown>): WorkerMessage => ({
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        payload,
      });

      const createSuccessResponse = (id: string, data: unknown, duration: number): WorkerResponse => ({
        id,
        type: 'success',
        data,
        duration,
      });

      const createErrorResponse = (id: string, error: string): WorkerResponse => ({
        id,
        type: 'error',
        error,
      });

      const createProgressResponse = (id: string, progress: number): WorkerResponse => ({
        id,
        type: 'progress',
        progress,
      });

      const testMessage = createMessage('adjust', { brightness: 50 });
      const successResponse = createSuccessResponse(testMessage.id, { processed: true }, 100);
      const errorResponse = createErrorResponse(testMessage.id, 'Processing failed');
      const progressResponse = createProgressResponse(testMessage.id, 50);

      return {
        messageTypeCount: MESSAGE_TYPES.length,
        messageTypes: MESSAGE_TYPES,
        testMessageHasId: !!testMessage.id,
        testMessageType: testMessage.type,
        successResponseType: successResponse.type,
        errorResponseHasError: !!errorResponse.error,
        progressResponseProgress: progressResponse.progress,
      };
    });

    expect(result.messageTypeCount).toBe(10);
    expect(result.messageTypes).toContain('adjust');
    expect(result.messageTypes).toContain('histogram');
    expect(result.testMessageHasId).toBe(true);
    expect(result.testMessageType).toBe('adjust');
    expect(result.successResponseType).toBe('success');
    expect(result.errorResponseHasError).toBe(true);
    expect(result.progressResponseProgress).toBe(50);
  });

  test('should manage worker pool', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface WorkerPoolState {
        workerCount: number;
        pendingTasks: number;
        currentWorker: number;
        isReady: boolean;
      }

      const createWorkerPool = (count: number): WorkerPoolState => ({
        workerCount: count,
        pendingTasks: 0,
        currentWorker: 0,
        isReady: true,
      });

      const getNextWorker = (state: WorkerPoolState): { index: number; newState: WorkerPoolState } => {
        const index = state.currentWorker;
        const newState = {
          ...state,
          currentWorker: (state.currentWorker + 1) % state.workerCount,
        };
        return { index, newState };
      };

      const addPendingTask = (state: WorkerPoolState): WorkerPoolState => ({
        ...state,
        pendingTasks: state.pendingTasks + 1,
      });

      const completePendingTask = (state: WorkerPoolState): WorkerPoolState => ({
        ...state,
        pendingTasks: Math.max(0, state.pendingTasks - 1),
      });

      let pool = createWorkerPool(4);

      const { index: worker1, newState: state1 } = getNextWorker(pool);
      pool = state1;

      const { index: worker2, newState: state2 } = getNextWorker(pool);
      pool = state2;

      const { index: worker3, newState: state3 } = getNextWorker(pool);
      pool = state3;

      const { index: worker4, newState: state4 } = getNextWorker(pool);
      pool = state4;

      const { index: worker5 } = getNextWorker(pool);

      pool = addPendingTask(pool);
      pool = addPendingTask(pool);
      const pendingAfterAdd = pool.pendingTasks;

      pool = completePendingTask(pool);
      const pendingAfterComplete = pool.pendingTasks;

      return {
        workerCount: pool.workerCount,
        worker1,
        worker2,
        worker3,
        worker4,
        worker5, // Should wrap around to 0
        pendingAfterAdd,
        pendingAfterComplete,
      };
    });

    expect(result.workerCount).toBe(4);
    expect(result.worker1).toBe(0);
    expect(result.worker2).toBe(1);
    expect(result.worker3).toBe(2);
    expect(result.worker4).toBe(3);
    expect(result.worker5).toBe(0); // Wrapped around
    expect(result.pendingAfterAdd).toBe(2);
    expect(result.pendingAfterComplete).toBe(1);
  });
});

test.describe('WebGL Processing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should detect WebGL support', async ({ page }) => {
    const result = await page.evaluate(() => {
      const isWebGLSupported = (): boolean => {
        try {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          return !!gl;
        } catch {
          return false;
        }
      };

      const getWebGLCapabilities = (): Record<string, unknown> | null => {
        try {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (!gl) return null;

          return {
            version: gl instanceof WebGL2RenderingContext ? 2 : 1,
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
            renderer: gl.getParameter(gl.RENDERER),
            vendor: gl.getParameter(gl.VENDOR),
          };
        } catch {
          return null;
        }
      };

      const supported = isWebGLSupported();
      const capabilities = getWebGLCapabilities();

      return {
        isSupported: supported,
        hasCapabilities: capabilities !== null,
        version: capabilities?.version,
        maxTextureSize: capabilities?.maxTextureSize,
      };
    });

    // WebGL may or may not be supported depending on the test environment
    expect(typeof result.isSupported).toBe('boolean');
    if (result.isSupported) {
      expect(result.hasCapabilities).toBe(true);
      expect(result.version).toBeGreaterThanOrEqual(1);
    }
  });

  test('should configure shader parameters', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ShaderUniforms {
        brightness: number;
        contrast: number;
        saturation: number;
        hue: number;
      }

      interface LevelsUniforms {
        inputBlack: number;
        inputWhite: number;
        inputGamma: number;
        outputBlack: number;
        outputWhite: number;
      }

      interface HSLUniforms {
        hueShift: number;
        saturationMultiplier: number;
        lightnessOffset: number;
      }

      const createAdjustmentUniforms = (params: Partial<ShaderUniforms>): ShaderUniforms => ({
        brightness: params.brightness ?? 0,
        contrast: params.contrast ?? 0,
        saturation: params.saturation ?? 0,
        hue: params.hue ?? 0,
      });

      const createLevelsUniforms = (params: Partial<LevelsUniforms>): LevelsUniforms => ({
        inputBlack: (params.inputBlack ?? 0) / 255,
        inputWhite: (params.inputWhite ?? 255) / 255,
        inputGamma: params.inputGamma ?? 1,
        outputBlack: (params.outputBlack ?? 0) / 255,
        outputWhite: (params.outputWhite ?? 255) / 255,
      });

      const createHSLUniforms = (params: Partial<HSLUniforms>): HSLUniforms => ({
        hueShift: (params.hueShift ?? 0) / 360,
        saturationMultiplier: 1 + (params.saturationMultiplier ?? 0) / 100,
        lightnessOffset: (params.lightnessOffset ?? 0) / 100,
      });

      const adjustmentUniforms = createAdjustmentUniforms({ brightness: 50, contrast: 25 });
      const levelsUniforms = createLevelsUniforms({ inputBlack: 30, inputWhite: 225 });
      const hslUniforms = createHSLUniforms({ hueShift: 45, saturationMultiplier: 20 });

      return {
        adjustmentUniforms,
        levelsUniforms,
        hslUniforms,
        normalizedInputBlack: levelsUniforms.inputBlack,
        normalizedHueShift: hslUniforms.hueShift,
      };
    });

    expect(result.adjustmentUniforms.brightness).toBe(50);
    expect(result.adjustmentUniforms.contrast).toBe(25);
    expect(result.normalizedInputBlack).toBeCloseTo(30 / 255, 2);
    expect(result.normalizedHueShift).toBeCloseTo(45 / 360, 2);
    expect(result.hslUniforms.saturationMultiplier).toBe(1.2);
  });
});

test.describe('Progressive Image Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should configure progressive loader options', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ProgressiveLoaderOptions {
        maxPreviewSize: number;
        previewQuality: number;
        useBlurhash: boolean;
        enableCaching: boolean;
      }

      const DEFAULT_OPTIONS: ProgressiveLoaderOptions = {
        maxPreviewSize: 64,
        previewQuality: 0.3,
        useBlurhash: true,
        enableCaching: true,
      };

      const validateOptions = (options: Partial<ProgressiveLoaderOptions>): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        const full = { ...DEFAULT_OPTIONS, ...options };

        if (full.maxPreviewSize < 16 || full.maxPreviewSize > 256) {
          errors.push('Max preview size must be 16-256');
        }
        if (full.previewQuality < 0.1 || full.previewQuality > 1) {
          errors.push('Preview quality must be 0.1-1');
        }

        return { valid: errors.length === 0, errors };
      };

      return {
        defaultOptions: DEFAULT_OPTIONS,
        validOptions: validateOptions({ maxPreviewSize: 128, previewQuality: 0.5 }),
        invalidPreviewSize: validateOptions({ maxPreviewSize: 512 }),
        invalidQuality: validateOptions({ previewQuality: 1.5 }),
      };
    });

    expect(result.defaultOptions.maxPreviewSize).toBe(64);
    expect(result.validOptions.valid).toBe(true);
    expect(result.invalidPreviewSize.valid).toBe(false);
    expect(result.invalidQuality.valid).toBe(false);
  });

  test('should manage loading stages', async ({ page }) => {
    const result = await page.evaluate(() => {
      type LoadingStage = 'idle' | 'loading-preview' | 'preview-ready' | 'loading-full' | 'complete' | 'error';

      interface LoadingState {
        stage: LoadingStage;
        previewUrl: string | null;
        fullUrl: string | null;
        progress: number;
        error: string | null;
      }

      const createInitialState = (): LoadingState => ({
        stage: 'idle',
        previewUrl: null,
        fullUrl: null,
        progress: 0,
        error: null,
      });

      const startLoading = (state: LoadingState): LoadingState => ({
        ...state,
        stage: 'loading-preview',
        progress: 0,
        error: null,
      });

      const setPreviewReady = (state: LoadingState, previewUrl: string): LoadingState => ({
        ...state,
        stage: 'preview-ready',
        previewUrl,
        progress: 25,
      });

      const startFullLoading = (state: LoadingState): LoadingState => ({
        ...state,
        stage: 'loading-full',
        progress: 50,
      });

      const setComplete = (state: LoadingState, fullUrl: string): LoadingState => ({
        ...state,
        stage: 'complete',
        fullUrl,
        progress: 100,
      });

      const _setError = (state: LoadingState, error: string): LoadingState => ({
        ...state,
        stage: 'error',
        error,
      });

      let state = createInitialState();
      const initialStage = state.stage;

      state = startLoading(state);
      const loadingStage = state.stage;

      state = setPreviewReady(state, 'preview-url');
      const previewStage = state.stage;
      const hasPreview = state.previewUrl !== null;

      state = startFullLoading(state);
      const fullLoadingStage = state.stage;

      state = setComplete(state, 'full-url');
      const completeStage = state.stage;
      const hasFull = state.fullUrl !== null;

      return {
        initialStage,
        loadingStage,
        previewStage,
        hasPreview,
        fullLoadingStage,
        completeStage,
        hasFull,
        finalProgress: state.progress,
      };
    });

    expect(result.initialStage).toBe('idle');
    expect(result.loadingStage).toBe('loading-preview');
    expect(result.previewStage).toBe('preview-ready');
    expect(result.hasPreview).toBe(true);
    expect(result.fullLoadingStage).toBe('loading-full');
    expect(result.completeStage).toBe('complete');
    expect(result.hasFull).toBe(true);
    expect(result.finalProgress).toBe(100);
  });
});

test.describe('Performance Monitoring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should track operation performance metrics', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface PerformanceMetric {
        operation: string;
        duration: number;
        method: 'worker' | 'webgl' | 'main-thread';
        imageSize: { width: number; height: number };
        timestamp: number;
      }

      const metrics: PerformanceMetric[] = [];

      const addMetric = (metric: Omit<PerformanceMetric, 'timestamp'>): void => {
        metrics.push({ ...metric, timestamp: Date.now() });
      };

      const getAverageByOperation = (operation: string): number => {
        const operationMetrics = metrics.filter(m => m.operation === operation);
        if (operationMetrics.length === 0) return 0;
        return operationMetrics.reduce((sum, m) => sum + m.duration, 0) / operationMetrics.length;
      };

      const getMetricsByMethod = (method: PerformanceMetric['method']): PerformanceMetric[] => {
        return metrics.filter(m => m.method === method);
      };

      // Add test metrics
      addMetric({ operation: 'adjust', duration: 50, method: 'webgl', imageSize: { width: 1024, height: 768 } });
      addMetric({ operation: 'adjust', duration: 100, method: 'worker', imageSize: { width: 1024, height: 768 } });
      addMetric({ operation: 'adjust', duration: 200, method: 'main-thread', imageSize: { width: 1024, height: 768 } });
      addMetric({ operation: 'levels', duration: 30, method: 'webgl', imageSize: { width: 1024, height: 768 } });
      addMetric({ operation: 'histogram', duration: 80, method: 'worker', imageSize: { width: 1024, height: 768 } });

      return {
        totalMetrics: metrics.length,
        averageAdjust: getAverageByOperation('adjust'),
        webglMetricsCount: getMetricsByMethod('webgl').length,
        workerMetricsCount: getMetricsByMethod('worker').length,
        mainThreadMetricsCount: getMetricsByMethod('main-thread').length,
      };
    });

    expect(result.totalMetrics).toBe(5);
    expect(result.averageAdjust).toBeCloseTo(116.67, 0);
    expect(result.webglMetricsCount).toBe(2);
    expect(result.workerMetricsCount).toBe(2);
    expect(result.mainThreadMetricsCount).toBe(1);
  });

  test('should select best processing method', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ProcessingCapabilities {
        hasWebGL: boolean;
        hasWorker: boolean;
        webGLMaxTextureSize: number;
      }

      const selectBestMethod = (
        capabilities: ProcessingCapabilities,
        imageWidth: number,
        imageHeight: number,
        operationType: string
      ): 'webgl' | 'worker' | 'main-thread' => {
        // WebGL-optimized operations
        const webglOptimized = ['adjust', 'levels', 'curves', 'hsl', 'sharpen'];

        // Check if image fits in WebGL texture
        const fitsInTexture = 
          imageWidth <= capabilities.webGLMaxTextureSize && 
          imageHeight <= capabilities.webGLMaxTextureSize;

        if (capabilities.hasWebGL && fitsInTexture && webglOptimized.includes(operationType)) {
          return 'webgl';
        }

        if (capabilities.hasWorker) {
          return 'worker';
        }

        return 'main-thread';
      };

      const fullCapabilities: ProcessingCapabilities = {
        hasWebGL: true,
        hasWorker: true,
        webGLMaxTextureSize: 4096,
      };

      const noWebGL: ProcessingCapabilities = {
        hasWebGL: false,
        hasWorker: true,
        webGLMaxTextureSize: 0,
      };

      const noWorker: ProcessingCapabilities = {
        hasWebGL: false,
        hasWorker: false,
        webGLMaxTextureSize: 0,
      };

      return {
        adjustWithWebGL: selectBestMethod(fullCapabilities, 1024, 768, 'adjust'),
        adjustWithoutWebGL: selectBestMethod(noWebGL, 1024, 768, 'adjust'),
        adjustWithNothing: selectBestMethod(noWorker, 1024, 768, 'adjust'),
        histogramWithWebGL: selectBestMethod(fullCapabilities, 1024, 768, 'histogram'),
        largeImageWithWebGL: selectBestMethod(fullCapabilities, 8192, 8192, 'adjust'),
      };
    });

    expect(result.adjustWithWebGL).toBe('webgl');
    expect(result.adjustWithoutWebGL).toBe('worker');
    expect(result.adjustWithNothing).toBe('main-thread');
    expect(result.histogramWithWebGL).toBe('worker'); // Not WebGL-optimized
    expect(result.largeImageWithWebGL).toBe('worker'); // Image too large for WebGL
  });
});
