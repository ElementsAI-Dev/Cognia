/**
 * Tests for ImageComparison component
 */

import { ImageComparison } from './image-comparison';

describe('ImageComparison', () => {
  it('should export ImageComparison component', () => {
    expect(ImageComparison).toBeDefined();
    expect(typeof ImageComparison).toBe('function');
  });

  it('should have correct display name or name', () => {
    expect(ImageComparison.name).toBe('ImageComparison');
  });
});
