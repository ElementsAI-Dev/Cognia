/**
 * Tests for DrawingTools component
 */

import { DrawingTools } from './drawing-tools';

describe('DrawingTools', () => {
  it('should export DrawingTools component', () => {
    expect(DrawingTools).toBeDefined();
    expect(typeof DrawingTools).toBe('function');
  });

  it('should have correct display name or name', () => {
    expect(DrawingTools.name).toBe('DrawingTools');
  });
});
