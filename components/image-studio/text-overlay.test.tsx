/**
 * Tests for TextOverlay component
 */

import { TextOverlay } from './text-overlay';

describe('TextOverlay', () => {
  it('should export TextOverlay component', () => {
    expect(TextOverlay).toBeDefined();
    expect(typeof TextOverlay).toBe('function');
  });

  it('should have correct display name or name', () => {
    expect(TextOverlay.name).toBe('TextOverlay');
  });
});
