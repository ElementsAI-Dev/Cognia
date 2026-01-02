/**
 * Tests for HistoryPanel component
 */

import { HistoryPanel } from './history-panel';

describe('HistoryPanel', () => {
  it('should export HistoryPanel component', () => {
    expect(HistoryPanel).toBeDefined();
    expect(typeof HistoryPanel).toBe('function');
  });

  it('should have correct display name or name', () => {
    expect(HistoryPanel.name).toBe('HistoryPanel');
  });
});
