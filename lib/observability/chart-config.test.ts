/**
 * Tests for chart configuration
 */

import {
  TOOLTIP_STYLE,
  CHART_MARGINS,
  CHART_COLORS,
  EXTENDED_COLORS,
  PERCENTILE_COLORS,
  TOKEN_COLORS,
  GRID_STYLE,
  AXIS_STYLE,
} from '@/lib/observability/chart-config';

describe('chart-config', () => {
  describe('TOOLTIP_STYLE', () => {
    it('should have contentStyle with CSS variables', () => {
      expect(TOOLTIP_STYLE.contentStyle).toBeDefined();
      expect(TOOLTIP_STYLE.contentStyle.backgroundColor).toContain('hsl(var(--popover))');
      expect(TOOLTIP_STYLE.contentStyle.border).toContain('hsl(var(--border))');
      expect(TOOLTIP_STYLE.contentStyle.borderRadius).toBe('6px');
    });

    it('should have labelStyle with bold font', () => {
      expect(TOOLTIP_STYLE.labelStyle).toBeDefined();
      expect(TOOLTIP_STYLE.labelStyle.fontWeight).toBe('bold');
    });

    it('should have itemStyle with foreground color', () => {
      expect(TOOLTIP_STYLE.itemStyle).toBeDefined();
      expect(TOOLTIP_STYLE.itemStyle.color).toContain('hsl(var(--foreground))');
    });
  });

  describe('CHART_MARGINS', () => {
    it('should have default margins', () => {
      expect(CHART_MARGINS.default).toEqual({ top: 10, right: 30, left: 0, bottom: 0 });
    });

    it('should have margins with Y axis', () => {
      expect(CHART_MARGINS.withYAxis).toEqual({ top: 10, right: 30, left: 20, bottom: 0 });
    });

    it('should have compact margins', () => {
      expect(CHART_MARGINS.compact).toEqual({ top: 5, right: 10, left: 5, bottom: 5 });
    });

    it('should have vertical margins', () => {
      expect(CHART_MARGINS.vertical).toEqual({ top: 5, right: 30, left: 20, bottom: 5 });
    });
  });

  describe('CHART_COLORS', () => {
    it('should have primary color', () => {
      expect(CHART_COLORS.primary).toBe('#8884d8');
    });

    it('should have secondary color', () => {
      expect(CHART_COLORS.secondary).toBe('#82ca9d');
    });

    it('should have status colors', () => {
      expect(CHART_COLORS.success).toBe('#22c55e');
      expect(CHART_COLORS.warning).toBe('#eab308');
      expect(CHART_COLORS.error).toBe('#ef4444');
      expect(CHART_COLORS.info).toBe('#3b82f6');
    });
  });

  describe('EXTENDED_COLORS', () => {
    it('should have at least 7 colors for pie charts', () => {
      expect(EXTENDED_COLORS.length).toBeGreaterThanOrEqual(7);
    });

    it('should contain hex color values', () => {
      EXTENDED_COLORS.forEach((color) => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('PERCENTILE_COLORS', () => {
    it('should have p50 color (green)', () => {
      expect(PERCENTILE_COLORS.p50).toBe('#22c55e');
    });

    it('should have p90 color (yellow)', () => {
      expect(PERCENTILE_COLORS.p90).toBe('#eab308');
    });

    it('should have p99 color (red)', () => {
      expect(PERCENTILE_COLORS.p99).toBe('#ef4444');
    });
  });

  describe('TOKEN_COLORS', () => {
    it('should have input token color', () => {
      expect(TOKEN_COLORS.input).toBe('#8884d8');
    });

    it('should have output token color', () => {
      expect(TOKEN_COLORS.output).toBe('#82ca9d');
    });
  });

  describe('GRID_STYLE', () => {
    it('should have strokeDasharray', () => {
      expect(GRID_STYLE.strokeDasharray).toBe('3 3');
    });

    it('should have stroke using CSS variable', () => {
      expect(GRID_STYLE.stroke).toContain('hsl(var(--border))');
    });

    it('should have strokeOpacity', () => {
      expect(GRID_STYLE.strokeOpacity).toBe(0.5);
    });
  });

  describe('AXIS_STYLE', () => {
    it('should have tick styling', () => {
      expect(AXIS_STYLE.tick.fill).toContain('hsl(var(--muted-foreground))');
      expect(AXIS_STYLE.tick.fontSize).toBe(12);
    });

    it('should have axisLine styling', () => {
      expect(AXIS_STYLE.axisLine.stroke).toContain('hsl(var(--border))');
    });
  });
});
