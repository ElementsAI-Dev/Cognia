/**
 * Tests for LayersPanel component
 */

import { LayersPanel } from './layers-panel';

describe('LayersPanel', () => {
  it('should export LayersPanel component', () => {
    expect(LayersPanel).toBeDefined();
    expect(typeof LayersPanel).toBe('function');
  });

  it('should have correct display name or name', () => {
    expect(LayersPanel.name).toBe('LayersPanel');
  });
});
