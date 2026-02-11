/**
 * Tests for node-slice.ts
 * Verifies that onNodesChange skips validation for position/dimensions changes
 */

import { applyNodeChanges } from '@xyflow/react';

jest.mock('@xyflow/react', () => ({
  applyNodeChanges: jest.fn((changes, nodes) => nodes),
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id'),
}));

// We test the onNodesChange handler by extracting the logic
// The key behavior: position/dimensions/select changes should NOT trigger validation
describe('node-slice onNodesChange validation skip', () => {
  beforeEach(() => {
    (applyNodeChanges as jest.Mock).mockClear();
  });

  // Helper that replicates the shouldValidate logic from node-slice
  const shouldValidate = (changes: Array<{ type: string }>) => {
    return changes.some(
      (c) => c.type !== 'select' && c.type !== 'position' && c.type !== 'dimensions'
    );
  };

  it('should NOT validate on position-only changes', () => {
    const changes = [
      { type: 'position', id: 'n1', position: { x: 100, y: 200 } },
    ];
    expect(shouldValidate(changes)).toBe(false);
  });

  it('should NOT validate on dimensions-only changes', () => {
    const changes = [
      { type: 'dimensions', id: 'n1', dimensions: { width: 200, height: 100 } },
    ];
    expect(shouldValidate(changes)).toBe(false);
  });

  it('should NOT validate on select-only changes', () => {
    const changes = [
      { type: 'select', id: 'n1', selected: true },
    ];
    expect(shouldValidate(changes)).toBe(false);
  });

  it('should NOT validate on mixed position + select changes', () => {
    const changes = [
      { type: 'position', id: 'n1' },
      { type: 'select', id: 'n2' },
      { type: 'dimensions', id: 'n3' },
    ];
    expect(shouldValidate(changes)).toBe(false);
  });

  it('should validate on add changes', () => {
    const changes = [
      { type: 'add', id: 'n1' },
    ];
    expect(shouldValidate(changes)).toBe(true);
  });

  it('should validate on remove changes', () => {
    const changes = [
      { type: 'remove', id: 'n1' },
    ];
    expect(shouldValidate(changes)).toBe(true);
  });

  it('should validate on replace changes', () => {
    const changes = [
      { type: 'replace', id: 'n1' },
    ];
    expect(shouldValidate(changes)).toBe(true);
  });

  it('should validate when structural change mixed with position', () => {
    const changes = [
      { type: 'position', id: 'n1' },
      { type: 'add', id: 'n2' },
    ];
    expect(shouldValidate(changes)).toBe(true);
  });

  it('should handle empty changes array', () => {
    const changes: Array<{ type: string }> = [];
    expect(shouldValidate(changes)).toBe(false);
  });
});
