/**
 * @jest-environment jsdom
 */

import {
  TAILWIND_CSS_MAP,
  SPACING_SCALE,
  NAMED_COLORS,
  resolveDynamicTailwindClass,
  detectColor,
  convertUnits,
  isInClassAttribute,
  getTailwindClassAtPosition,
  colorSwatchMarkdown,
} from './hover-provider';

describe('hover-provider', () => {
  describe('TAILWIND_CSS_MAP', () => {
    it('should have mappings for common classes', () => {
      expect(TAILWIND_CSS_MAP['flex']).toBe('display: flex;');
      expect(TAILWIND_CSS_MAP['hidden']).toBe('display: none;');
      expect(TAILWIND_CSS_MAP['relative']).toBe('position: relative;');
      expect(TAILWIND_CSS_MAP['text-center']).toBe('text-align: center;');
    });

    it('should have font size mappings with px comments', () => {
      expect(TAILWIND_CSS_MAP['text-sm']).toContain('14px');
      expect(TAILWIND_CSS_MAP['text-base']).toContain('16px');
      expect(TAILWIND_CSS_MAP['text-lg']).toContain('18px');
    });

    it('should have border radius mappings', () => {
      expect(TAILWIND_CSS_MAP['rounded']).toContain('4px');
      expect(TAILWIND_CSS_MAP['rounded-lg']).toContain('8px');
      expect(TAILWIND_CSS_MAP['rounded-full']).toBe('border-radius: 9999px;');
    });

    it('should have shadow mappings', () => {
      expect(TAILWIND_CSS_MAP['shadow']).toContain('box-shadow');
      expect(TAILWIND_CSS_MAP['shadow-none']).toContain('0 0');
    });

    it('should have transition mappings', () => {
      expect(TAILWIND_CSS_MAP['transition']).toContain('transition-property');
      expect(TAILWIND_CSS_MAP['duration-200']).toContain('200ms');
    });
  });

  describe('SPACING_SCALE', () => {
    it('should have common spacing values', () => {
      expect(SPACING_SCALE['0']).toBe('0px');
      expect(SPACING_SCALE['1']).toContain('4px');
      expect(SPACING_SCALE['2']).toContain('8px');
      expect(SPACING_SCALE['4']).toContain('16px');
      expect(SPACING_SCALE['8']).toContain('32px');
      expect(SPACING_SCALE['px']).toBe('1px');
      expect(SPACING_SCALE['full']).toBe('100%');
    });
  });

  describe('resolveDynamicTailwindClass', () => {
    it('should resolve padding classes', () => {
      expect(resolveDynamicTailwindClass('p-4')).toContain('padding');
      expect(resolveDynamicTailwindClass('p-4')).toContain('16px');
    });

    it('should resolve margin classes', () => {
      expect(resolveDynamicTailwindClass('m-2')).toContain('margin');
      expect(resolveDynamicTailwindClass('m-2')).toContain('8px');
    });

    it('should resolve directional padding', () => {
      expect(resolveDynamicTailwindClass('px-4')).toContain('padding-left/right');
      expect(resolveDynamicTailwindClass('py-2')).toContain('padding-top/bottom');
      expect(resolveDynamicTailwindClass('pt-1')).toContain('padding-top');
    });

    it('should resolve gap classes', () => {
      expect(resolveDynamicTailwindClass('gap-4')).toContain('gap');
      expect(resolveDynamicTailwindClass('gap-x-2')).toContain('column-gap');
    });

    it('should resolve width/height classes', () => {
      expect(resolveDynamicTailwindClass('w-4')).toContain('width');
      expect(resolveDynamicTailwindClass('h-8')).toContain('height');
    });

    it('should resolve negative margins', () => {
      const result = resolveDynamicTailwindClass('-mt-2');
      expect(result).toContain('margin-top');
      expect(result).toContain('-');
    });

    it('should resolve grid columns', () => {
      expect(resolveDynamicTailwindClass('grid-cols-3')).toContain('repeat(3');
      expect(resolveDynamicTailwindClass('grid-cols-none')).toContain('none');
    });

    it('should resolve col span', () => {
      expect(resolveDynamicTailwindClass('col-span-2')).toContain('span 2');
      expect(resolveDynamicTailwindClass('col-span-full')).toContain('1 / -1');
    });

    it('should resolve line-clamp', () => {
      expect(resolveDynamicTailwindClass('line-clamp-3')).toContain('-webkit-line-clamp: 3');
    });

    it('should resolve scale', () => {
      expect(resolveDynamicTailwindClass('scale-75')).toContain('0.75');
    });

    it('should resolve rotate', () => {
      expect(resolveDynamicTailwindClass('rotate-45')).toContain('45deg');
    });

    it('should resolve fraction widths', () => {
      const result = resolveDynamicTailwindClass('w-1/2');
      expect(result).toContain('50%');
    });

    it('should return null for unknown classes', () => {
      expect(resolveDynamicTailwindClass('unknown-class')).toBeNull();
    });
  });

  describe('detectColor', () => {
    it('should detect hex colors', () => {
      expect(detectColor('#ff0000')).toBe('#ff0000');
      expect(detectColor('#f00')).toBe('#f00');
    });

    it('should detect rgb colors', () => {
      expect(detectColor('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)');
    });

    it('should detect rgba colors', () => {
      expect(detectColor('rgba(255, 0, 0, 0.5)')).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('should detect hsl colors', () => {
      expect(detectColor('hsl(120, 100%, 50%)')).toBe('hsl(120, 100%, 50%)');
    });

    it('should detect named colors', () => {
      expect(detectColor('red')).toBe('#ff0000');
      expect(detectColor('blue')).toBe('#0000ff');
      expect(detectColor('transparent')).toBe('transparent');
    });

    it('should return null for non-colors', () => {
      expect(detectColor('hello')).toBeNull();
      expect(detectColor('123')).toBeNull();
    });
  });

  describe('convertUnits', () => {
    it('should convert px to rem', () => {
      const result = convertUnits('16px');
      expect(result).toContain('16px');
      expect(result).toContain('1rem');
    });

    it('should convert rem to px', () => {
      const result = convertUnits('1.5rem');
      expect(result).toContain('1.5rem');
      expect(result).toContain('24px');
    });

    it('should convert em to px', () => {
      const result = convertUnits('2em');
      expect(result).toContain('2em');
      expect(result).toContain('32px');
    });

    it('should return null for non-unit values', () => {
      expect(convertUnits('hello')).toBeNull();
      expect(convertUnits('100%')).toBeNull();
    });
  });

  describe('isInClassAttribute', () => {
    it('should detect inside className', () => {
      expect(isInClassAttribute('className="flex', 16)).toBe(true);
    });

    it('should detect inside cn()', () => {
      expect(isInClassAttribute('cn("flex', 9)).toBe(true);
    });

    it('should not detect outside className', () => {
      expect(isInClassAttribute('value="hello"', 14)).toBe(false);
    });
  });

  describe('getTailwindClassAtPosition', () => {
    it('should extract class at position', () => {
      // 'className="flex items-center"'
      //  1234567890123456789...
      // column 13 is inside 'flex'
      const result = getTailwindClassAtPosition('className="flex items-center"', 13);
      expect(result).toBe('flex');
    });

    it('should extract class with hyphens', () => {
      // column 22 is inside 'items-center'
      const result = getTailwindClassAtPosition('className="flex items-center"', 22);
      expect(result).toBe('items-center');
    });

    it('should return null outside className', () => {
      const result = getTailwindClassAtPosition('const x = 5;', 11);
      expect(result).toBeNull();
    });
  });

  describe('colorSwatchMarkdown', () => {
    it('should return markdown with color', () => {
      const result = colorSwatchMarkdown('#ff0000');
      expect(result).toContain('#ff0000');
      expect(result).toContain('Color');
    });
  });

  describe('NAMED_COLORS', () => {
    it('should contain standard CSS named colors', () => {
      expect(NAMED_COLORS['black']).toBe('#000000');
      expect(NAMED_COLORS['white']).toBe('#ffffff');
      expect(NAMED_COLORS['red']).toBe('#ff0000');
      expect(NAMED_COLORS['transparent']).toBe('transparent');
    });
  });
});
