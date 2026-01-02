/**
 * Color utilities for theme customization
 * Includes contrast checking, color manipulation, and palette generation
 */

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Convert hex to HSL
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

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
}

/**
 * Convert HSL to hex
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  return rgbToHex(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  );
}

/**
 * Calculate relative luminance of a color
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG requirements
 */
export type ContrastLevel = 'fail' | 'AA-large' | 'AA' | 'AAA';

export function checkContrast(foreground: string, background: string): {
  ratio: number;
  level: ContrastLevel;
  passes: {
    normalText: boolean;
    largeText: boolean;
    uiComponents: boolean;
  };
} {
  const ratio = getContrastRatio(foreground, background);
  
  let level: ContrastLevel = 'fail';
  if (ratio >= 7) {
    level = 'AAA';
  } else if (ratio >= 4.5) {
    level = 'AA';
  } else if (ratio >= 3) {
    level = 'AA-large';
  }

  return {
    ratio,
    level,
    passes: {
      normalText: ratio >= 4.5, // WCAG AA for normal text
      largeText: ratio >= 3,    // WCAG AA for large text (18pt+ or 14pt+ bold)
      uiComponents: ratio >= 3, // WCAG AA for UI components
    },
  };
}

/**
 * Suggest a foreground color that meets contrast requirements
 */
export function suggestForegroundColor(background: string, preferDark = true): string {
  const bgLuminance = getRelativeLuminance(background);
  
  // If background is dark, use light foreground and vice versa
  if (bgLuminance < 0.5) {
    return preferDark ? '#f8fafc' : '#ffffff';
  } else {
    return preferDark ? '#0f172a' : '#000000';
  }
}

/**
 * Adjust color brightness
 */
export function adjustBrightness(hex: string, percent: number): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  
  const newL = Math.max(0, Math.min(100, hsl.l + percent));
  return hslToHex(hsl.h, hsl.s, newL);
}

/**
 * Generate complementary color
 */
export function getComplementaryColor(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  
  const newH = (hsl.h + 180) % 360;
  return hslToHex(newH, hsl.s, hsl.l);
}

/**
 * Generate analogous colors (colors next to each other on the color wheel)
 */
export function getAnalogousColors(hex: string, count = 3): string[] {
  const hsl = hexToHsl(hex);
  if (!hsl) return [hex];
  
  const colors: string[] = [];
  const step = 30;
  const startOffset = -step * Math.floor(count / 2);
  
  for (let i = 0; i < count; i++) {
    const newH = (hsl.h + startOffset + step * i + 360) % 360;
    colors.push(hslToHex(newH, hsl.s, hsl.l));
  }
  
  return colors;
}

/**
 * Generate triadic colors (three colors evenly spaced on the color wheel)
 */
export function getTriadicColors(hex: string): [string, string, string] {
  const hsl = hexToHsl(hex);
  if (!hsl) return [hex, hex, hex];
  
  return [
    hex,
    hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l),
  ];
}

/**
 * Generate split-complementary colors
 */
export function getSplitComplementaryColors(hex: string): [string, string, string] {
  const hsl = hexToHsl(hex);
  if (!hsl) return [hex, hex, hex];
  
  return [
    hex,
    hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l),
  ];
}

/**
 * Generate a color palette from a base color
 */
export interface ColorPalette {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
  };
  isDark: boolean;
}

export function generatePaletteFromColor(baseColor: string, isDark: boolean): ColorPalette {
  const hsl = hexToHsl(baseColor);
  if (!hsl) {
    return {
      name: 'Custom',
      colors: {
        primary: baseColor,
        secondary: isDark ? '#1e293b' : '#f1f5f9',
        accent: isDark ? '#1e293b' : '#f1f5f9',
        background: isDark ? '#0f172a' : '#ffffff',
        foreground: isDark ? '#f8fafc' : '#0f172a',
        muted: isDark ? '#1e293b' : '#f1f5f9',
      },
      isDark,
    };
  }

  // Generate secondary and accent from analogous colors
  const analogous = getAnalogousColors(baseColor, 3);
  
  return {
    name: 'Custom',
    colors: {
      primary: baseColor,
      secondary: isDark 
        ? hslToHex(hsl.h, Math.max(10, hsl.s - 30), 15)
        : hslToHex(hsl.h, Math.max(10, hsl.s - 30), 95),
      accent: analogous[2],
      background: isDark ? '#0f172a' : '#ffffff',
      foreground: isDark ? '#f8fafc' : '#0f172a',
      muted: isDark 
        ? hslToHex(hsl.h, Math.max(5, hsl.s - 40), 20)
        : hslToHex(hsl.h, Math.max(5, hsl.s - 40), 96),
    },
    isDark,
  };
}

/**
 * Pre-defined color palette suggestions
 */
export const PALETTE_SUGGESTIONS: ColorPalette[] = [
  {
    name: 'Ocean Blue',
    colors: {
      primary: '#0ea5e9',
      secondary: '#f0f9ff',
      accent: '#06b6d4',
      background: '#ffffff',
      foreground: '#0f172a',
      muted: '#f1f5f9',
    },
    isDark: false,
  },
  {
    name: 'Ocean Blue Dark',
    colors: {
      primary: '#38bdf8',
      secondary: '#0c4a6e',
      accent: '#22d3ee',
      background: '#0f172a',
      foreground: '#f8fafc',
      muted: '#1e293b',
    },
    isDark: true,
  },
  {
    name: 'Emerald Green',
    colors: {
      primary: '#10b981',
      secondary: '#ecfdf5',
      accent: '#14b8a6',
      background: '#ffffff',
      foreground: '#0f172a',
      muted: '#f1f5f9',
    },
    isDark: false,
  },
  {
    name: 'Emerald Dark',
    colors: {
      primary: '#34d399',
      secondary: '#064e3b',
      accent: '#2dd4bf',
      background: '#0f172a',
      foreground: '#f8fafc',
      muted: '#1e293b',
    },
    isDark: true,
  },
  {
    name: 'Royal Purple',
    colors: {
      primary: '#8b5cf6',
      secondary: '#f5f3ff',
      accent: '#a78bfa',
      background: '#ffffff',
      foreground: '#0f172a',
      muted: '#f1f5f9',
    },
    isDark: false,
  },
  {
    name: 'Royal Purple Dark',
    colors: {
      primary: '#a78bfa',
      secondary: '#4c1d95',
      accent: '#c4b5fd',
      background: '#0f172a',
      foreground: '#f8fafc',
      muted: '#1e293b',
    },
    isDark: true,
  },
  {
    name: 'Sunset Orange',
    colors: {
      primary: '#f97316',
      secondary: '#fff7ed',
      accent: '#fb923c',
      background: '#ffffff',
      foreground: '#0f172a',
      muted: '#f1f5f9',
    },
    isDark: false,
  },
  {
    name: 'Sunset Dark',
    colors: {
      primary: '#fb923c',
      secondary: '#7c2d12',
      accent: '#fdba74',
      background: '#0f172a',
      foreground: '#f8fafc',
      muted: '#1e293b',
    },
    isDark: true,
  },
  {
    name: 'Rose Pink',
    colors: {
      primary: '#f43f5e',
      secondary: '#fff1f2',
      accent: '#fb7185',
      background: '#ffffff',
      foreground: '#0f172a',
      muted: '#f1f5f9',
    },
    isDark: false,
  },
  {
    name: 'Rose Pink Dark',
    colors: {
      primary: '#fb7185',
      secondary: '#881337',
      accent: '#fda4af',
      background: '#0f172a',
      foreground: '#f8fafc',
      muted: '#1e293b',
    },
    isDark: true,
  },
  {
    name: 'Slate Gray',
    colors: {
      primary: '#475569',
      secondary: '#f8fafc',
      accent: '#64748b',
      background: '#ffffff',
      foreground: '#0f172a',
      muted: '#f1f5f9',
    },
    isDark: false,
  },
  {
    name: 'Slate Dark',
    colors: {
      primary: '#94a3b8',
      secondary: '#1e293b',
      accent: '#cbd5e1',
      background: '#0f172a',
      foreground: '#f8fafc',
      muted: '#1e293b',
    },
    isDark: true,
  },
];

/**
 * Get palette suggestions filtered by dark mode preference
 */
export function getPaletteSuggestions(isDark: boolean): ColorPalette[] {
  return PALETTE_SUGGESTIONS.filter(p => p.isDark === isDark);
}

/**
 * Validate a color hex string
 */
export function isValidHex(hex: string): boolean {
  return /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/.test(hex);
}

/**
 * Ensure hex has # prefix
 */
export function normalizeHex(hex: string): string {
  if (!hex.startsWith('#')) {
    return '#' + hex;
  }
  return hex;
}
