/**
 * HSL Adjustment
 * Hue, Saturation, Lightness adjustments with targeted color ranges
 */

export interface HSLOptions {
  hue: number;
  saturation: number;
  lightness: number;
}

export interface HSLTargetedOptions extends HSLOptions {
  targetHue?: number;
  hueRange?: number;
}

export interface HSLChannelOptions {
  reds: HSLOptions;
  oranges: HSLOptions;
  yellows: HSLOptions;
  greens: HSLOptions;
  cyans: HSLOptions;
  blues: HSLOptions;
  purples: HSLOptions;
  magentas: HSLOptions;
}

export const DEFAULT_HSL: HSLOptions = {
  hue: 0,
  saturation: 0,
  lightness: 0,
};

export const HUE_RANGES = {
  reds: { center: 0, range: 30 },
  oranges: { center: 30, range: 30 },
  yellows: { center: 60, range: 30 },
  greens: { center: 120, range: 60 },
  cyans: { center: 180, range: 30 },
  blues: { center: 240, range: 60 },
  purples: { center: 270, range: 30 },
  magentas: { center: 330, range: 30 },
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
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

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
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

function hueDistance(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2);
  return Math.min(diff, 360 - diff);
}

function calculateHueBlendFactor(hue: number, targetHue: number, range: number): number {
  const distance = hueDistance(hue, targetHue);
  if (distance >= range) return 0;
  return 1 - distance / range;
}

export function applyHSL(imageData: ImageData, options: HSLOptions): ImageData {
  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data.length);
  const { hue, saturation, lightness } = options;

  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);

    const newH = (h + hue + 360) % 360;
    const newS = clamp(s + saturation, 0, 100);
    const newL = clamp(l + lightness, 0, 100);

    const [r, g, b] = hslToRgb(newH, newS, newL);

    result[i] = r;
    result[i + 1] = g;
    result[i + 2] = b;
    result[i + 3] = data[i + 3];
  }

  return new ImageData(result, width, height);
}

export function applyTargetedHSL(imageData: ImageData, options: HSLTargetedOptions): ImageData {
  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data.length);
  const { hue, saturation, lightness, targetHue, hueRange = 30 } = options;

  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);

    let factor = 1;
    if (targetHue !== undefined) {
      factor = calculateHueBlendFactor(h, targetHue, hueRange);
    }

    if (factor > 0) {
      const newH = (h + hue * factor + 360) % 360;
      const newS = clamp(s + saturation * factor, 0, 100);
      const newL = clamp(l + lightness * factor, 0, 100);

      const [r, g, b] = hslToRgb(newH, newS, newL);

      result[i] = r;
      result[i + 1] = g;
      result[i + 2] = b;
    } else {
      result[i] = data[i];
      result[i + 1] = data[i + 1];
      result[i + 2] = data[i + 2];
    }
    result[i + 3] = data[i + 3];
  }

  return new ImageData(result, width, height);
}

export function applyChannelHSL(
  imageData: ImageData,
  channels: Partial<HSLChannelOptions>
): ImageData {
  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);

    let totalHueShift = 0;
    let totalSatShift = 0;
    let totalLightShift = 0;
    let totalWeight = 0;

    for (const [channelName, adjustment] of Object.entries(channels)) {
      if (!adjustment) continue;

      const range = HUE_RANGES[channelName as keyof typeof HUE_RANGES];
      if (!range) continue;

      const factor = calculateHueBlendFactor(h, range.center, range.range);
      if (factor > 0) {
        totalHueShift += adjustment.hue * factor;
        totalSatShift += adjustment.saturation * factor;
        totalLightShift += adjustment.lightness * factor;
        totalWeight += factor;
      }
    }

    if (totalWeight > 0) {
      const newH = (h + totalHueShift + 360) % 360;
      const newS = clamp(s + totalSatShift, 0, 100);
      const newL = clamp(l + totalLightShift, 0, 100);

      const [r, g, b] = hslToRgb(newH, newS, newL);

      result[i] = r;
      result[i + 1] = g;
      result[i + 2] = b;
    } else {
      result[i] = data[i];
      result[i + 1] = data[i + 1];
      result[i + 2] = data[i + 2];
    }
    result[i + 3] = data[i + 3];
  }

  return new ImageData(result, width, height);
}

export function applyVibrance(imageData: ImageData, vibrance: number): ImageData {
  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data.length);
  const amount = vibrance / 100;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = (max - min) / 255;

    const adjustAmount = amount * (1 - sat);
    const gray = 0.2989 * r + 0.587 * g + 0.114 * b;

    result[i] = clamp(gray + (1 + adjustAmount) * (r - gray), 0, 255);
    result[i + 1] = clamp(gray + (1 + adjustAmount) * (g - gray), 0, 255);
    result[i + 2] = clamp(gray + (1 + adjustAmount) * (b - gray), 0, 255);
    result[i + 3] = data[i + 3];
  }

  return new ImageData(result, width, height);
}

export function applyTemperature(imageData: ImageData, temperature: number): ImageData {
  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data.length);
  const temp = temperature / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    const g = data[i + 1];
    let b = data[i + 2];

    r = clamp(r + temp * 30, 0, 255);
    b = clamp(b - temp * 30, 0, 255);

    result[i] = r;
    result[i + 1] = g;
    result[i + 2] = b;
    result[i + 3] = data[i + 3];
  }

  return new ImageData(result, width, height);
}

export function applyTint(imageData: ImageData, tint: number): ImageData {
  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data.length);
  const t = tint / 100;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    let g = data[i + 1];
    const b = data[i + 2];

    g = clamp(g - t * 30, 0, 255);

    result[i] = r;
    result[i + 1] = g;
    result[i + 2] = b;
    result[i + 3] = data[i + 3];
  }

  return new ImageData(result, width, height);
}

export default applyHSL;
