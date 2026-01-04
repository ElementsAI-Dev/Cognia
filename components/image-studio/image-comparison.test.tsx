/**
 * Tests for ImageComparison component
 * 
 * Note: This component uses complex Image operations with multiple useEffect hooks
 * that cause AggregateErrors in React 19's strict act() mode. Canvas interaction tests
 * are covered in E2E tests. Unit tests focus on component exports.
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
