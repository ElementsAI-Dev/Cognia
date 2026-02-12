import { getHeatmapColor, getLast52Weeks } from './stats-utils';

describe('getHeatmapColor', () => {
  it('returns muted color for zero count', () => {
    expect(getHeatmapColor(0, 10)).toBe('var(--muted)');
  });

  it('returns muted color for zero count even when max is 0', () => {
    expect(getHeatmapColor(0, 0)).toBe('var(--muted)');
  });

  it('returns lightest green for low ratio (< 0.25)', () => {
    const color = getHeatmapColor(1, 10);
    expect(color).toBe('hsl(150, 50%, 75%)');
  });

  it('returns medium-light green for ratio 0.25-0.5', () => {
    const color = getHeatmapColor(3, 10);
    expect(color).toBe('hsl(150, 60%, 55%)');
  });

  it('returns medium-dark green for ratio 0.5-0.75', () => {
    const color = getHeatmapColor(6, 10);
    expect(color).toBe('hsl(150, 70%, 40%)');
  });

  it('returns darkest green for high ratio (>= 0.75)', () => {
    const color = getHeatmapColor(8, 10);
    expect(color).toBe('hsl(150, 80%, 30%)');
  });

  it('returns darkest green when count equals max', () => {
    expect(getHeatmapColor(10, 10)).toBe('hsl(150, 80%, 30%)');
  });

  it('handles max of 0 with non-zero count without division error', () => {
    // max=0, count=5 → ratio = 5/max(0,1) = 5 → >= 0.75
    const color = getHeatmapColor(5, 0);
    expect(color).toBe('hsl(150, 80%, 30%)');
  });

  it('returns correct color at exact boundaries', () => {
    // ratio = 0.25 → falls into < 0.5 bucket
    expect(getHeatmapColor(25, 100)).toBe('hsl(150, 60%, 55%)');
    // ratio = 0.5 → falls into < 0.75 bucket
    expect(getHeatmapColor(50, 100)).toBe('hsl(150, 70%, 40%)');
    // ratio = 0.75 → falls into >= 0.75 bucket
    expect(getHeatmapColor(75, 100)).toBe('hsl(150, 80%, 30%)');
  });
});

describe('getLast52Weeks', () => {
  it('returns an array of date strings', () => {
    const days = getLast52Weeks();
    expect(Array.isArray(days)).toBe(true);
    expect(days.length).toBeGreaterThan(0);
  });

  it('returns dates in YYYY-MM-DD format', () => {
    const days = getLast52Weeks();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    days.forEach((day) => {
      expect(day).toMatch(dateRegex);
    });
  });

  it('returns approximately 365 days (52 weeks + partial)', () => {
    const days = getLast52Weeks();
    // 52 weeks = 364 days, plus partial current week
    expect(days.length).toBeGreaterThanOrEqual(364);
    expect(days.length).toBeLessThanOrEqual(371);
  });

  it('returns dates in ascending chronological order', () => {
    const days = getLast52Weeks();
    for (let i = 1; i < days.length; i++) {
      expect(days[i] > days[i - 1]).toBe(true);
    }
  });

  it('includes today\'s date as the last or near-last entry', () => {
    const days = getLast52Weeks();
    const today = new Date().toISOString().split('T')[0];
    expect(days).toContain(today);
  });

  it('first date is approximately 52 weeks ago', () => {
    const days = getLast52Weeks();
    const firstDate = new Date(days[0]);
    const now = new Date();
    const diffMs = now.getTime() - firstDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    // Should be roughly 364 days ago (52 weeks)
    expect(diffDays).toBeGreaterThanOrEqual(360);
    expect(diffDays).toBeLessThanOrEqual(375);
  });
});
