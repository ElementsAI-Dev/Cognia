/**
 * Tests for MaskCanvas component
 */

import { MaskCanvas } from './mask-canvas';

describe('MaskCanvas', () => {
  it('should export MaskCanvas component', () => {
    expect(MaskCanvas).toBeDefined();
    expect(typeof MaskCanvas).toBe('function');
  });

  it('should have correct display name or name', () => {
    expect(MaskCanvas.name).toBe('MaskCanvas');
  });
});
