/**
 * Tests for Canvas Actions utilities
 */

import {
  applyCanvasActionResult,
  getActionDescription,
  type CanvasActionType,
} from './canvas-actions';

describe('applyCanvasActionResult', () => {
  it('returns result directly when no selection', () => {
    const original = 'Original content';
    const result = 'New content';
    
    expect(applyCanvasActionResult(original, result)).toBe('New content');
  });

  it('returns result directly when selection is empty', () => {
    const original = 'Original content';
    const result = 'New content';
    
    expect(applyCanvasActionResult(original, result, '')).toBe('New content');
  });

  it('returns result directly when selection is whitespace', () => {
    const original = 'Original content';
    const result = 'New content';
    
    expect(applyCanvasActionResult(original, result, '   ')).toBe('New content');
  });

  it('replaces selection in content', () => {
    const original = 'Hello world, how are you?';
    const result = 'everyone';
    const selection = 'world';
    
    expect(applyCanvasActionResult(original, result, selection)).toBe('Hello everyone, how are you?');
  });

  it('replaces selection at the beginning', () => {
    const original = 'Hello world';
    const result = 'Hi';
    const selection = 'Hello';
    
    expect(applyCanvasActionResult(original, result, selection)).toBe('Hi world');
  });

  it('replaces selection at the end', () => {
    const original = 'Hello world';
    const result = 'everyone';
    const selection = 'world';
    
    expect(applyCanvasActionResult(original, result, selection)).toBe('Hello everyone');
  });

  it('returns result when selection not found', () => {
    const original = 'Hello world';
    const result = 'New content';
    const selection = 'missing';
    
    expect(applyCanvasActionResult(original, result, selection)).toBe('New content');
  });

  it('handles multi-line content', () => {
    const original = 'Line 1\nLine 2\nLine 3';
    const result = 'Modified Line';
    const selection = 'Line 2';
    
    expect(applyCanvasActionResult(original, result, selection)).toBe('Line 1\nModified Line\nLine 3');
  });

  it('replaces only first occurrence', () => {
    const original = 'word word word';
    const result = 'replaced';
    const selection = 'word';
    
    expect(applyCanvasActionResult(original, result, selection)).toBe('replaced word word');
  });

  it('handles special characters in selection', () => {
    const original = 'function() { return true; }';
    const result = 'false';
    const selection = 'true';
    
    expect(applyCanvasActionResult(original, result, selection)).toBe('function() { return false; }');
  });
});

describe('getActionDescription', () => {
  const actionTypes: CanvasActionType[] = [
    'review',
    'fix',
    'improve',
    'explain',
    'simplify',
    'expand',
    'translate',
    'format',
    'run',
  ];

  it('returns description for all action types', () => {
    actionTypes.forEach((actionType) => {
      const description = getActionDescription(actionType);
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });
  });

  it('returns correct description for review', () => {
    const description = getActionDescription('review');
    expect(description.toLowerCase()).toContain('review');
  });

  it('returns correct description for fix', () => {
    const description = getActionDescription('fix');
    expect(description.toLowerCase()).toContain('fix');
  });

  it('returns correct description for improve', () => {
    const description = getActionDescription('improve');
    expect(description).toBeDefined();
    expect(description.length).toBeGreaterThan(0);
  });

  it('returns correct description for explain', () => {
    const description = getActionDescription('explain');
    // Description should be defined
    expect(description).toBeDefined();
    expect(description.length).toBeGreaterThan(0);
  });

  it('returns correct description for simplify', () => {
    const description = getActionDescription('simplify');
    expect(description.toLowerCase()).toContain('simpl');
  });

  it('returns correct description for expand', () => {
    const description = getActionDescription('expand');
    expect(description.toLowerCase()).toContain('detail');
  });

  it('returns correct description for translate', () => {
    const description = getActionDescription('translate');
    expect(description.toLowerCase()).toContain('translate');
  });

  it('returns correct description for format', () => {
    const description = getActionDescription('format');
    expect(description.toLowerCase()).toContain('format');
  });

  it('returns correct description for run', () => {
    const description = getActionDescription('run');
    expect(description.toLowerCase()).toContain('execut');
  });
});
