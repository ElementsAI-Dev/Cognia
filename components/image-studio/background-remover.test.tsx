/**
 * Tests for BackgroundRemover component
 */

import { BackgroundRemover } from './background-remover';

describe('BackgroundRemover', () => {
  it('should export BackgroundRemover component', () => {
    expect(BackgroundRemover).toBeDefined();
    expect(typeof BackgroundRemover).toBe('function');
  });

  it('should have correct display name or name', () => {
    expect(BackgroundRemover.name).toBe('BackgroundRemover');
  });
});
