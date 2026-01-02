/**
 * Tests for FiltersGallery component
 */

import { FiltersGallery } from './filters-gallery';

describe('FiltersGallery', () => {
  it('should export FiltersGallery component', () => {
    expect(FiltersGallery).toBeDefined();
    expect(typeof FiltersGallery).toBe('function');
  });

  it('should have correct display name or name', () => {
    expect(FiltersGallery.name).toBe('FiltersGallery');
  });
});
