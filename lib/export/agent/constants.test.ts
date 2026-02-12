/**
 * Tests for agent export constants and utilities
 */

import { formatAgentDuration } from './constants';

describe('formatAgentDuration', () => {
  it('should format milliseconds', () => {
    expect(formatAgentDuration(0)).toBe('0ms');
    expect(formatAgentDuration(500)).toBe('500ms');
    expect(formatAgentDuration(999)).toBe('999ms');
  });

  it('should format seconds', () => {
    expect(formatAgentDuration(1000)).toBe('1.0s');
    expect(formatAgentDuration(1500)).toBe('1.5s');
    expect(formatAgentDuration(30000)).toBe('30.0s');
    expect(formatAgentDuration(59999)).toBe('60.0s');
  });

  it('should format minutes and seconds', () => {
    expect(formatAgentDuration(60000)).toBe('1m 0s');
    expect(formatAgentDuration(90000)).toBe('1m 30s');
    expect(formatAgentDuration(125000)).toBe('2m 5s');
    expect(formatAgentDuration(3600000)).toBe('60m 0s');
  });
});
