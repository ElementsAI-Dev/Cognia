/**
 * Monaco Editor Color Provider
 * Provides inline color decorations and color picker support
 * Detects hex, rgb/rgba, hsl/hsla, and named CSS colors
 */

import type * as Monaco from 'monaco-editor';

// ============================================================
// Color Parsing Utilities
// ============================================================

/** Parse hex color to RGBA (0-1 range) */
function hexToRgba(hex: string): { red: number; green: number; blue: number; alpha: number } | null {
  const clean = hex.replace('#', '');
  let r: number, g: number, b: number, a = 1;

  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16) / 255;
    g = parseInt(clean[1] + clean[1], 16) / 255;
    b = parseInt(clean[2] + clean[2], 16) / 255;
  } else if (clean.length === 4) {
    r = parseInt(clean[0] + clean[0], 16) / 255;
    g = parseInt(clean[1] + clean[1], 16) / 255;
    b = parseInt(clean[2] + clean[2], 16) / 255;
    a = parseInt(clean[3] + clean[3], 16) / 255;
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16) / 255;
    g = parseInt(clean.substring(2, 4), 16) / 255;
    b = parseInt(clean.substring(4, 6), 16) / 255;
  } else if (clean.length === 8) {
    r = parseInt(clean.substring(0, 2), 16) / 255;
    g = parseInt(clean.substring(2, 4), 16) / 255;
    b = parseInt(clean.substring(4, 6), 16) / 255;
    a = parseInt(clean.substring(6, 8), 16) / 255;
  } else {
    return null;
  }

  if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) return null;
  return { red: r, green: g, blue: b, alpha: a };
}

/** Parse rgb/rgba string to RGBA (0-1 range) */
function rgbToRgba(rgb: string): { red: number; green: number; blue: number; alpha: number } | null {
  const match = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (!match) return null;
  return {
    red: parseInt(match[1]) / 255,
    green: parseInt(match[2]) / 255,
    blue: parseInt(match[3]) / 255,
    alpha: match[4] ? parseFloat(match[4]) : 1,
  };
}

/** Parse hsl/hsla string to RGBA (0-1 range) */
function hslToRgba(hsl: string): { red: number; green: number; blue: number; alpha: number } | null {
  const match = hsl.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*(?:,\s*([\d.]+))?\s*\)/);
  if (!match) return null;

  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;
  const a = match[4] ? parseFloat(match[4]) : 1;

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

  return { red: r, green: g, blue: b, alpha: a };
}

/** Convert RGBA (0-1 range) to hex string */
function rgbaToHex(color: { red: number; green: number; blue: number; alpha: number }): string {
  const r = Math.round(color.red * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.green * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.blue * 255).toString(16).padStart(2, '0');
  if (color.alpha < 1) {
    const a = Math.round(color.alpha * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}${a}`;
  }
  return `#${r}${g}${b}`;
}

/** Convert RGBA (0-1 range) to rgb/rgba string */
function rgbaToRgbString(color: { red: number; green: number; blue: number; alpha: number }): string {
  const r = Math.round(color.red * 255);
  const g = Math.round(color.green * 255);
  const b = Math.round(color.blue * 255);
  if (color.alpha < 1) {
    return `rgba(${r}, ${g}, ${b}, ${color.alpha})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

/** Convert RGBA (0-1 range) to hsl/hsla string */
function rgbaToHslString(color: { red: number; green: number; blue: number; alpha: number }): string {
  const r = color.red;
  const g = color.green;
  const b = color.blue;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);

  if (color.alpha < 1) {
    return `hsla(${hDeg}, ${sPct}%, ${lPct}%, ${color.alpha})`;
  }
  return `hsl(${hDeg}, ${sPct}%, ${lPct}%)`;
}

// ============================================================
// Color Regex Patterns
// ============================================================

/** Regex to find all color values in text */
const COLOR_REGEX = /(?:#[0-9a-fA-F]{3,8}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+)?\s*\)|hsla?\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*(?:,\s*[\d.]+)?\s*\))/g;

/**
 * Find all color occurrences in a line
 */
function findColorsInLine(lineContent: string): { color: string; startColumn: number; endColumn: number }[] {
  const results: { color: string; startColumn: number; endColumn: number }[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(COLOR_REGEX.source, 'g');

  while ((match = regex.exec(lineContent)) !== null) {
    results.push({
      color: match[0],
      startColumn: match.index + 1,
      endColumn: match.index + match[0].length + 1,
    });
  }

  return results;
}

/**
 * Parse any color string to RGBA
 */
function parseColor(color: string): { red: number; green: number; blue: number; alpha: number } | null {
  if (color.startsWith('#')) return hexToRgba(color);
  if (color.startsWith('rgb')) return rgbToRgba(color);
  if (color.startsWith('hsl')) return hslToRgba(color);
  return null;
}

// ============================================================
// Color Provider Registration
// ============================================================

/**
 * Register Monaco color provider for inline color decorations and color picker
 */
export function registerColorProvider(
  monaco: typeof Monaco,
  languages: string[] = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact', 'html', 'css', 'scss', 'less']
): Monaco.IDisposable[] {
  const disposables: Monaco.IDisposable[] = [];

  for (const lang of languages) {
    const disposable = monaco.languages.registerColorProvider(lang, {
      provideDocumentColors: (model) => {
        const colors: Monaco.languages.IColorInformation[] = [];
        const lineCount = model.getLineCount();

        for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
          const lineContent = model.getLineContent(lineNumber);
          const colorMatches = findColorsInLine(lineContent);

          for (const { color, startColumn, endColumn } of colorMatches) {
            const parsed = parseColor(color);
            if (parsed) {
              colors.push({
                color: parsed,
                range: new monaco.Range(lineNumber, startColumn, lineNumber, endColumn),
              });
            }
          }
        }

        return colors;
      },

      provideColorPresentations: (model, colorInfo) => {
        const { color } = colorInfo;
        const presentations: Monaco.languages.IColorPresentation[] = [];

        // Hex presentation
        presentations.push({
          label: rgbaToHex(color),
          textEdit: {
            range: colorInfo.range,
            text: rgbaToHex(color),
          },
        });

        // RGB presentation
        presentations.push({
          label: rgbaToRgbString(color),
          textEdit: {
            range: colorInfo.range,
            text: rgbaToRgbString(color),
          },
        });

        // HSL presentation
        presentations.push({
          label: rgbaToHslString(color),
          textEdit: {
            range: colorInfo.range,
            text: rgbaToHslString(color),
          },
        });

        return presentations;
      },
    });
    disposables.push(disposable);
  }

  return disposables;
}

// Export for testing
export {
  hexToRgba,
  rgbToRgba,
  hslToRgba,
  rgbaToHex,
  rgbaToRgbString,
  rgbaToHslString,
  findColorsInLine,
  parseColor,
  COLOR_REGEX,
};
