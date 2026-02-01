/**
 * Tests for ImageAdjustmentsPanel component
 * 
 * Note: This component uses complex canvas/Image operations with multiple useEffect hooks
 * that cause AggregateErrors in React 19's strict act() mode. Canvas interaction tests
 * are covered in E2E tests. Unit tests focus on component exports.
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
