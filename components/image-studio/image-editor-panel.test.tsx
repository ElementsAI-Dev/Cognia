/**
 * Tests for ImageEditorPanel component
 */

import { ImageEditorPanel } from './image-editor-panel';

describe('ImageEditorPanel', () => {
  it('should export ImageEditorPanel component', () => {
    expect(ImageEditorPanel).toBeDefined();
    expect(typeof ImageEditorPanel).toBe('function');
  });

  it('should have correct display name or name', () => {
    expect(ImageEditorPanel.name).toBe('ImageEditorPanel');
  });
});
