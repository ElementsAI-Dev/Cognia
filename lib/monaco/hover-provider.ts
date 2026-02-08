/**
 * Monaco Editor Enhanced Hover Provider
 * Provides rich hover information for Tailwind classes, CSS colors, and unit conversions
 */

import type * as Monaco from 'monaco-editor';

// ============================================================
// Tailwind Class → CSS Mapping
// ============================================================

/** Mapping of Tailwind utility classes to their CSS equivalents */
const TAILWIND_CSS_MAP: Record<string, string> = {
  // Display
  'block': 'display: block;',
  'inline-block': 'display: inline-block;',
  'inline': 'display: inline;',
  'flex': 'display: flex;',
  'inline-flex': 'display: inline-flex;',
  'grid': 'display: grid;',
  'inline-grid': 'display: inline-grid;',
  'hidden': 'display: none;',
  'contents': 'display: contents;',
  'flow-root': 'display: flow-root;',
  'table': 'display: table;',

  // Position
  'static': 'position: static;',
  'fixed': 'position: fixed;',
  'absolute': 'position: absolute;',
  'relative': 'position: relative;',
  'sticky': 'position: sticky;',

  // Flex Direction
  'flex-row': 'flex-direction: row;',
  'flex-row-reverse': 'flex-direction: row-reverse;',
  'flex-col': 'flex-direction: column;',
  'flex-col-reverse': 'flex-direction: column-reverse;',

  // Flex Wrap
  'flex-wrap': 'flex-wrap: wrap;',
  'flex-wrap-reverse': 'flex-wrap: wrap-reverse;',
  'flex-nowrap': 'flex-wrap: nowrap;',

  // Flex
  'flex-1': 'flex: 1 1 0%;',
  'flex-auto': 'flex: 1 1 auto;',
  'flex-initial': 'flex: 0 1 auto;',
  'flex-none': 'flex: none;',
  'grow': 'flex-grow: 1;',
  'grow-0': 'flex-grow: 0;',
  'shrink': 'flex-shrink: 1;',
  'shrink-0': 'flex-shrink: 0;',

  // Align Items
  'items-start': 'align-items: flex-start;',
  'items-end': 'align-items: flex-end;',
  'items-center': 'align-items: center;',
  'items-baseline': 'align-items: baseline;',
  'items-stretch': 'align-items: stretch;',

  // Justify Content
  'justify-start': 'justify-content: flex-start;',
  'justify-end': 'justify-content: flex-end;',
  'justify-center': 'justify-content: center;',
  'justify-between': 'justify-content: space-between;',
  'justify-around': 'justify-content: space-around;',
  'justify-evenly': 'justify-content: space-evenly;',

  // Align Self
  'self-auto': 'align-self: auto;',
  'self-start': 'align-self: flex-start;',
  'self-end': 'align-self: flex-end;',
  'self-center': 'align-self: center;',
  'self-stretch': 'align-self: stretch;',
  'self-baseline': 'align-self: baseline;',

  // Text Align
  'text-left': 'text-align: left;',
  'text-center': 'text-align: center;',
  'text-right': 'text-align: right;',
  'text-justify': 'text-align: justify;',
  'text-start': 'text-align: start;',
  'text-end': 'text-align: end;',

  // Font Size
  'text-xs': 'font-size: 0.75rem; /* 12px */ line-height: 1rem; /* 16px */',
  'text-sm': 'font-size: 0.875rem; /* 14px */ line-height: 1.25rem; /* 20px */',
  'text-base': 'font-size: 1rem; /* 16px */ line-height: 1.5rem; /* 24px */',
  'text-lg': 'font-size: 1.125rem; /* 18px */ line-height: 1.75rem; /* 28px */',
  'text-xl': 'font-size: 1.25rem; /* 20px */ line-height: 1.75rem; /* 28px */',
  'text-2xl': 'font-size: 1.5rem; /* 24px */ line-height: 2rem; /* 32px */',
  'text-3xl': 'font-size: 1.875rem; /* 30px */ line-height: 2.25rem; /* 36px */',
  'text-4xl': 'font-size: 2.25rem; /* 36px */ line-height: 2.5rem; /* 40px */',
  'text-5xl': 'font-size: 3rem; /* 48px */ line-height: 1;',
  'text-6xl': 'font-size: 3.75rem; /* 60px */ line-height: 1;',
  'text-7xl': 'font-size: 4.5rem; /* 72px */ line-height: 1;',
  'text-8xl': 'font-size: 6rem; /* 96px */ line-height: 1;',
  'text-9xl': 'font-size: 8rem; /* 128px */ line-height: 1;',

  // Font Weight
  'font-thin': 'font-weight: 100;',
  'font-extralight': 'font-weight: 200;',
  'font-light': 'font-weight: 300;',
  'font-normal': 'font-weight: 400;',
  'font-medium': 'font-weight: 500;',
  'font-semibold': 'font-weight: 600;',
  'font-bold': 'font-weight: 700;',
  'font-extrabold': 'font-weight: 800;',
  'font-black': 'font-weight: 900;',

  // Text Decoration
  'underline': 'text-decoration-line: underline;',
  'overline': 'text-decoration-line: overline;',
  'line-through': 'text-decoration-line: line-through;',
  'no-underline': 'text-decoration-line: none;',

  // Text Transform
  'uppercase': 'text-transform: uppercase;',
  'lowercase': 'text-transform: lowercase;',
  'capitalize': 'text-transform: capitalize;',
  'normal-case': 'text-transform: none;',

  // Text Overflow
  'truncate': 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;',
  'text-ellipsis': 'text-overflow: ellipsis;',
  'text-clip': 'text-overflow: clip;',

  // Line Height
  'leading-none': 'line-height: 1;',
  'leading-tight': 'line-height: 1.25;',
  'leading-snug': 'line-height: 1.375;',
  'leading-normal': 'line-height: 1.5;',
  'leading-relaxed': 'line-height: 1.625;',
  'leading-loose': 'line-height: 2;',

  // Letter Spacing
  'tracking-tighter': 'letter-spacing: -0.05em;',
  'tracking-tight': 'letter-spacing: -0.025em;',
  'tracking-normal': 'letter-spacing: 0em;',
  'tracking-wide': 'letter-spacing: 0.025em;',
  'tracking-wider': 'letter-spacing: 0.05em;',
  'tracking-widest': 'letter-spacing: 0.1em;',

  // Whitespace
  'whitespace-normal': 'white-space: normal;',
  'whitespace-nowrap': 'white-space: nowrap;',
  'whitespace-pre': 'white-space: pre;',
  'whitespace-pre-line': 'white-space: pre-line;',
  'whitespace-pre-wrap': 'white-space: pre-wrap;',
  'whitespace-break-spaces': 'white-space: break-spaces;',
  'break-normal': 'overflow-wrap: normal; word-break: normal;',
  'break-words': 'overflow-wrap: break-word;',
  'break-all': 'word-break: break-all;',
  'break-keep': 'word-break: keep-all;',

  // Border Radius
  'rounded-none': 'border-radius: 0px;',
  'rounded-sm': 'border-radius: 0.125rem; /* 2px */',
  'rounded': 'border-radius: 0.25rem; /* 4px */',
  'rounded-md': 'border-radius: 0.375rem; /* 6px */',
  'rounded-lg': 'border-radius: 0.5rem; /* 8px */',
  'rounded-xl': 'border-radius: 0.75rem; /* 12px */',
  'rounded-2xl': 'border-radius: 1rem; /* 16px */',
  'rounded-3xl': 'border-radius: 1.5rem; /* 24px */',
  'rounded-full': 'border-radius: 9999px;',

  // Border Width
  'border': 'border-width: 1px;',
  'border-0': 'border-width: 0px;',
  'border-2': 'border-width: 2px;',
  'border-4': 'border-width: 4px;',
  'border-8': 'border-width: 8px;',
  'border-t': 'border-top-width: 1px;',
  'border-r': 'border-right-width: 1px;',
  'border-b': 'border-bottom-width: 1px;',
  'border-l': 'border-left-width: 1px;',

  // Border Style
  'border-solid': 'border-style: solid;',
  'border-dashed': 'border-style: dashed;',
  'border-dotted': 'border-style: dotted;',
  'border-double': 'border-style: double;',
  'border-hidden': 'border-style: hidden;',
  'border-none': 'border-style: none;',

  // Shadow
  'shadow-sm': 'box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);',
  'shadow': 'box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);',
  'shadow-md': 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);',
  'shadow-lg': 'box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);',
  'shadow-xl': 'box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);',
  'shadow-2xl': 'box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);',
  'shadow-inner': 'box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);',
  'shadow-none': 'box-shadow: 0 0 #0000;',

  // Opacity
  'opacity-0': 'opacity: 0;',
  'opacity-5': 'opacity: 0.05;',
  'opacity-10': 'opacity: 0.1;',
  'opacity-20': 'opacity: 0.2;',
  'opacity-25': 'opacity: 0.25;',
  'opacity-30': 'opacity: 0.3;',
  'opacity-40': 'opacity: 0.4;',
  'opacity-50': 'opacity: 0.5;',
  'opacity-60': 'opacity: 0.6;',
  'opacity-70': 'opacity: 0.7;',
  'opacity-75': 'opacity: 0.75;',
  'opacity-80': 'opacity: 0.8;',
  'opacity-90': 'opacity: 0.9;',
  'opacity-95': 'opacity: 0.95;',
  'opacity-100': 'opacity: 1;',

  // Overflow
  'overflow-auto': 'overflow: auto;',
  'overflow-hidden': 'overflow: hidden;',
  'overflow-visible': 'overflow: visible;',
  'overflow-scroll': 'overflow: scroll;',
  'overflow-x-auto': 'overflow-x: auto;',
  'overflow-y-auto': 'overflow-y: auto;',
  'overflow-x-hidden': 'overflow-x: hidden;',
  'overflow-y-hidden': 'overflow-y: hidden;',

  // Cursor
  'cursor-auto': 'cursor: auto;',
  'cursor-default': 'cursor: default;',
  'cursor-pointer': 'cursor: pointer;',
  'cursor-wait': 'cursor: wait;',
  'cursor-text': 'cursor: text;',
  'cursor-move': 'cursor: move;',
  'cursor-help': 'cursor: help;',
  'cursor-not-allowed': 'cursor: not-allowed;',
  'cursor-none': 'cursor: none;',
  'cursor-grab': 'cursor: grab;',
  'cursor-grabbing': 'cursor: grabbing;',

  // Pointer Events
  'pointer-events-none': 'pointer-events: none;',
  'pointer-events-auto': 'pointer-events: auto;',
  'select-none': 'user-select: none;',
  'select-text': 'user-select: text;',
  'select-all': 'user-select: all;',
  'select-auto': 'user-select: auto;',

  // Transition
  'transition-none': 'transition-property: none;',
  'transition-all': 'transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;',
  'transition': 'transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;',
  'transition-colors': 'transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;',
  'transition-opacity': 'transition-property: opacity; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;',
  'transition-shadow': 'transition-property: box-shadow; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;',
  'transition-transform': 'transition-property: transform; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;',

  // Duration
  'duration-75': 'transition-duration: 75ms;',
  'duration-100': 'transition-duration: 100ms;',
  'duration-150': 'transition-duration: 150ms;',
  'duration-200': 'transition-duration: 200ms;',
  'duration-300': 'transition-duration: 300ms;',
  'duration-500': 'transition-duration: 500ms;',
  'duration-700': 'transition-duration: 700ms;',
  'duration-1000': 'transition-duration: 1000ms;',

  // Ease
  'ease-linear': 'transition-timing-function: linear;',
  'ease-in': 'transition-timing-function: cubic-bezier(0.4, 0, 1, 1);',
  'ease-out': 'transition-timing-function: cubic-bezier(0, 0, 0.2, 1);',
  'ease-in-out': 'transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);',

  // Animation
  'animate-none': 'animation: none;',
  'animate-spin': 'animation: spin 1s linear infinite;',
  'animate-ping': 'animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;',
  'animate-pulse': 'animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;',
  'animate-bounce': 'animation: bounce 1s infinite;',

  // Z-Index
  'z-0': 'z-index: 0;',
  'z-10': 'z-index: 10;',
  'z-20': 'z-index: 20;',
  'z-30': 'z-index: 30;',
  'z-40': 'z-index: 40;',
  'z-50': 'z-index: 50;',
  'z-auto': 'z-index: auto;',

  // Object Fit
  'object-contain': 'object-fit: contain;',
  'object-cover': 'object-fit: cover;',
  'object-fill': 'object-fit: fill;',
  'object-none': 'object-fit: none;',
  'object-scale-down': 'object-fit: scale-down;',

  // Aspect
  'aspect-auto': 'aspect-ratio: auto;',
  'aspect-square': 'aspect-ratio: 1 / 1;',
  'aspect-video': 'aspect-ratio: 16 / 9;',

  // Accessibility
  'sr-only': 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0;',
  'not-sr-only': 'position: static; width: auto; height: auto; padding: 0; margin: 0; overflow: visible; clip: auto; white-space: normal;',

  // Inset
  'inset-0': 'inset: 0px;',
  'inset-x-0': 'left: 0px; right: 0px;',
  'inset-y-0': 'top: 0px; bottom: 0px;',
  'top-0': 'top: 0px;',
  'right-0': 'right: 0px;',
  'bottom-0': 'bottom: 0px;',
  'left-0': 'left: 0px;',

  // Container
  'container': 'width: 100%; /* Responsive max-width */',
  'mx-auto': 'margin-left: auto; margin-right: auto;',

  // Scroll
  'scroll-auto': 'scroll-behavior: auto;',
  'scroll-smooth': 'scroll-behavior: smooth;',
};

/** Spacing scale mapping (0-96) for dynamic Tailwind classes */
const SPACING_SCALE: Record<string, string> = {
  '0': '0px', '0.5': '0.125rem /* 2px */', '1': '0.25rem /* 4px */', '1.5': '0.375rem /* 6px */',
  '2': '0.5rem /* 8px */', '2.5': '0.625rem /* 10px */', '3': '0.75rem /* 12px */', '3.5': '0.875rem /* 14px */',
  '4': '1rem /* 16px */', '5': '1.25rem /* 20px */', '6': '1.5rem /* 24px */', '7': '1.75rem /* 28px */',
  '8': '2rem /* 32px */', '9': '2.25rem /* 36px */', '10': '2.5rem /* 40px */', '11': '2.75rem /* 44px */',
  '12': '3rem /* 48px */', '14': '3.5rem /* 56px */', '16': '4rem /* 64px */', '20': '5rem /* 80px */',
  '24': '6rem /* 96px */', '28': '7rem /* 112px */', '32': '8rem /* 128px */', '36': '9rem /* 144px */',
  '40': '10rem /* 160px */', '44': '11rem /* 176px */', '48': '12rem /* 192px */', '52': '13rem /* 208px */',
  '56': '14rem /* 224px */', '60': '15rem /* 240px */', '64': '16rem /* 256px */', '72': '18rem /* 288px */',
  '80': '20rem /* 320px */', '96': '24rem /* 384px */', 'px': '1px', 'auto': 'auto',
  'full': '100%', 'screen': '100vw',
};

/**
 * Resolve dynamic spacing-based Tailwind classes (p-4, m-2, gap-3, w-12, h-8, etc.)
 */
function resolveDynamicTailwindClass(className: string): string | null {
  // Spacing utilities: p, m, gap, space, w, h, size, top, right, bottom, left, inset
  const spacingPrefixes: Record<string, string> = {
    'p': 'padding', 'px': 'padding-left/right', 'py': 'padding-top/bottom',
    'pt': 'padding-top', 'pr': 'padding-right', 'pb': 'padding-bottom', 'pl': 'padding-left',
    'm': 'margin', 'mx': 'margin-left/right', 'my': 'margin-top/bottom',
    'mt': 'margin-top', 'mr': 'margin-right', 'mb': 'margin-bottom', 'ml': 'margin-left',
    'gap': 'gap', 'gap-x': 'column-gap', 'gap-y': 'row-gap',
    'space-x': 'margin-left (between)', 'space-y': 'margin-top (between)',
    'w': 'width', 'h': 'height', 'size': 'width & height',
    'min-w': 'min-width', 'min-h': 'min-height', 'max-w': 'max-width', 'max-h': 'max-height',
    'top': 'top', 'right': 'right', 'bottom': 'bottom', 'left': 'left',
    'scroll-m': 'scroll-margin', 'scroll-p': 'scroll-padding',
  };

  for (const [prefix, cssProperty] of Object.entries(spacingPrefixes)) {
    const regex = new RegExp(`^-?${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\S+)$`);
    const match = className.match(regex);
    if (match) {
      const value = match[1];
      const isNegative = className.startsWith('-');
      const resolvedValue = SPACING_SCALE[value];
      if (resolvedValue) {
        const sign = isNegative ? '-' : '';
        return `${cssProperty}: ${sign}${resolvedValue};`;
      }
      // Fraction values
      const fractionMatch = value.match(/^(\d+)\/(\d+)$/);
      if (fractionMatch) {
        const pct = (parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]) * 100).toFixed(6).replace(/\.?0+$/, '');
        return `${cssProperty}: ${pct}%;`;
      }
    }
  }

  // Grid columns/rows
  const gridColMatch = className.match(/^grid-cols-(\d+|none|subgrid)$/);
  if (gridColMatch) {
    if (gridColMatch[1] === 'none') return 'grid-template-columns: none;';
    if (gridColMatch[1] === 'subgrid') return 'grid-template-columns: subgrid;';
    return `grid-template-columns: repeat(${gridColMatch[1]}, minmax(0, 1fr));`;
  }

  const gridRowMatch = className.match(/^grid-rows-(\d+|none|subgrid)$/);
  if (gridRowMatch) {
    if (gridRowMatch[1] === 'none') return 'grid-template-rows: none;';
    if (gridRowMatch[1] === 'subgrid') return 'grid-template-rows: subgrid;';
    return `grid-template-rows: repeat(${gridRowMatch[1]}, minmax(0, 1fr));`;
  }

  // Col/row span
  const colSpanMatch = className.match(/^col-span-(\d+|full)$/);
  if (colSpanMatch) {
    if (colSpanMatch[1] === 'full') return 'grid-column: 1 / -1;';
    return `grid-column: span ${colSpanMatch[1]} / span ${colSpanMatch[1]};`;
  }

  // Line clamp
  const lineClampMatch = className.match(/^line-clamp-(\d+|none)$/);
  if (lineClampMatch) {
    if (lineClampMatch[1] === 'none') return 'overflow: visible; display: block; -webkit-line-clamp: unset;';
    return `overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: ${lineClampMatch[1]};`;
  }

  // Scale
  const scaleMatch = className.match(/^-?scale-(\d+)$/);
  if (scaleMatch) {
    return `transform: scale(${parseInt(scaleMatch[1]) / 100});`;
  }

  // Rotate
  const rotateMatch = className.match(/^-?rotate-(\d+)$/);
  if (rotateMatch) {
    const sign = className.startsWith('-') ? '-' : '';
    return `transform: rotate(${sign}${rotateMatch[1]}deg);`;
  }

  // Ring width
  const ringMatch = className.match(/^ring-(\d+)$/);
  if (ringMatch) {
    return `box-shadow: 0 0 0 ${ringMatch[1]}px var(--tw-ring-color);`;
  }

  // Outline width
  const outlineMatch = className.match(/^outline-(\d+)$/);
  if (outlineMatch) {
    return `outline-width: ${outlineMatch[1]}px;`;
  }

  return null;
}

// ============================================================
// Color Detection & Preview
// ============================================================

/** Named CSS colors with hex values */
const NAMED_COLORS: Record<string, string> = {
  'transparent': 'transparent',
  'black': '#000000', 'white': '#ffffff',
  'red': '#ff0000', 'green': '#008000', 'blue': '#0000ff',
  'yellow': '#ffff00', 'orange': '#ffa500', 'purple': '#800080',
  'pink': '#ffc0cb', 'gray': '#808080', 'grey': '#808080',
  'cyan': '#00ffff', 'magenta': '#ff00ff', 'lime': '#00ff00',
  'navy': '#000080', 'teal': '#008080', 'maroon': '#800000',
  'olive': '#808000', 'aqua': '#00ffff', 'silver': '#c0c0c0',
  'coral': '#ff7f50', 'crimson': '#dc143c', 'gold': '#ffd700',
  'indigo': '#4b0082', 'ivory': '#fffff0', 'khaki': '#f0e68c',
  'lavender': '#e6e6fa', 'salmon': '#fa8072', 'tomato': '#ff6347',
  'turquoise': '#40e0d0', 'violet': '#ee82ee', 'wheat': '#f5deb3',
};

/** Color regex patterns */
const COLOR_PATTERNS = [
  /(?<!\w)#([0-9a-fA-F]{3,8})(?!\w)/, // hex
  /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+)?\s*\)/, // rgb/rgba
  /hsla?\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*(?:,\s*[\d.]+)?\s*\)/, // hsl/hsla
];

/**
 * Try to detect a color value at a given word/position
 */
function detectColor(text: string): string | null {
  for (const pattern of COLOR_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  const lower = text.toLowerCase();
  if (NAMED_COLORS[lower]) return NAMED_COLORS[lower];
  return null;
}

/**
 * Generate a color swatch as markdown
 */
function colorSwatchMarkdown(color: string): string {
  return `\n\n🎨 **Color:** \`${color}\``;
}

// ============================================================
// CSS Unit Conversion
// ============================================================

const BASE_FONT_SIZE = 16; // px

/**
 * Convert px value to rem and vice versa
 */
function convertUnits(value: string): string | null {
  const pxMatch = value.match(/^(\d+(?:\.\d+)?)px$/);
  if (pxMatch) {
    const px = parseFloat(pxMatch[1]);
    const rem = px / BASE_FONT_SIZE;
    return `**${px}px** = **${rem}rem**`;
  }

  const remMatch = value.match(/^(\d+(?:\.\d+)?)rem$/);
  if (remMatch) {
    const rem = parseFloat(remMatch[1]);
    const px = rem * BASE_FONT_SIZE;
    return `**${rem}rem** = **${px}px**`;
  }

  const emMatch = value.match(/^(\d+(?:\.\d+)?)em$/);
  if (emMatch) {
    const em = parseFloat(emMatch[1]);
    const px = em * BASE_FONT_SIZE;
    return `**${em}em** ≈ **${px}px** (at base font size)`;
  }

  return null;
}

// ============================================================
// Hover Provider Registration
// ============================================================

/**
 * Detect if position is inside a className/class attribute
 */
function isInClassAttribute(lineContent: string, column: number): boolean {
  const before = lineContent.substring(0, column);
  return /(?:className|class)\s*=\s*["'{`][^"'}`]*$/.test(before) ||
         /(?:cn|clsx|twMerge)\s*\([^)]*['"][^'"]*$/.test(before);
}

/**
 * Get the Tailwind class word at the current position
 */
function getTailwindClassAtPosition(lineContent: string, column: number): string | null {
  if (!isInClassAttribute(lineContent, column)) return null;

  // Find the word at position (Tailwind classes can contain -, /, :, ., [, ])
  let start = column - 1;
  let end = column - 1;
  const validChars = /[a-zA-Z0-9\-_/:.[\]()!]/;

  while (start > 0 && validChars.test(lineContent[start - 1])) start--;
  while (end < lineContent.length && validChars.test(lineContent[end])) end++;

  const word = lineContent.substring(start, end);
  return word.length > 0 ? word : null;
}

/**
 * Register enhanced hover provider for Monaco
 */
export function registerEnhancedHoverProvider(
  monaco: typeof Monaco,
  languages: string[] = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact', 'html', 'css']
): Monaco.IDisposable[] {
  const disposables: Monaco.IDisposable[] = [];

  for (const lang of languages) {
    const disposable = monaco.languages.registerHoverProvider(lang, {
      provideHover: (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber);
        const word = model.getWordAtPosition(position);
        const hoverContents: Monaco.IMarkdownString[] = [];

        // 1. Tailwind class hover — show CSS equivalent
        const tailwindClass = getTailwindClassAtPosition(lineContent, position.column);
        if (tailwindClass) {
          // Remove variant prefixes (hover:, md:, etc.) for lookup
          const baseClass = tailwindClass.replace(/^(?:hover|focus|active|disabled|group-hover|dark|sm|md|lg|xl|2xl|focus-visible|focus-within|first|last|odd|even|placeholder|before|after|peer-hover|aria-selected|aria-disabled|data-\[[^\]]*\]):/, '');
          const negated = baseClass.startsWith('!');
          const lookupClass = negated ? baseClass.slice(1) : baseClass;

          let css = TAILWIND_CSS_MAP[lookupClass] || resolveDynamicTailwindClass(lookupClass);
          if (css) {
            if (negated) css += ' /* !important */';
            const prefix = tailwindClass !== lookupClass ? `**${tailwindClass}** → ` : '';
            hoverContents.push({
              value: `${prefix}**Tailwind CSS**\n\n\`\`\`css\n${css}\n\`\`\``,
            });
          }
        }

        // 2. Color preview
        if (word) {
          const wordText = word.word;
          // Check full text around the position for color patterns
          const surroundingText = lineContent.substring(Math.max(0, position.column - 30), position.column + 30);
          const color = detectColor(wordText) || detectColor(surroundingText);
          if (color) {
            hoverContents.push({
              value: `**Color Preview**${colorSwatchMarkdown(color)}`,
            });
          }
        }

        // 3. CSS unit conversion
        if (word) {
          // Check if the word + surrounding chars form a unit value (e.g., 16px, 1.5rem)
          const extendedWord = lineContent.substring(
            Math.max(0, word.startColumn - 5),
            Math.min(lineContent.length, word.endColumn + 5)
          );
          const unitMatch = extendedWord.match(/(\d+(?:\.\d+)?(?:px|rem|em))/);
          if (unitMatch) {
            const conversion = convertUnits(unitMatch[1]);
            if (conversion) {
              hoverContents.push({
                value: `**Unit Conversion**\n\n${conversion}`,
              });
            }
          }
        }

        if (hoverContents.length === 0) return null;

        const range = word
          ? new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn)
          : new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column + 1);

        return {
          range,
          contents: hoverContents,
        };
      },
    });
    disposables.push(disposable);
  }

  return disposables;
}

// Export for testing
export {
  TAILWIND_CSS_MAP,
  SPACING_SCALE,
  NAMED_COLORS,
  resolveDynamicTailwindClass,
  detectColor,
  convertUnits,
  isInClassAttribute,
  getTailwindClassAtPosition,
  colorSwatchMarkdown,
};
