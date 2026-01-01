/**
 * Tests for ImageAdjustmentsPanel component
 */

import { ImageAdjustmentsPanel } from './image-adjustments';

describe('ImageAdjustmentsPanel', () => {
  it('should export ImageAdjustmentsPanel component', () => {
    expect(ImageAdjustmentsPanel).toBeDefined();
    expect(typeof ImageAdjustmentsPanel).toBe('function');
  });

  it('should have correct display name or name', () => {
    expect(ImageAdjustmentsPanel.name).toBe('ImageAdjustmentsPanel');
  });
});
