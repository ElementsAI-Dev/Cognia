/**
 * Tests for useSkillAI hook
 */

import { renderHook } from '@testing-library/react';
import { useSkillAI } from './use-skill-ai';

const mockProcessSelectionWithAI = jest.fn();

jest.mock('@/lib/ai/generation/selection-ai', () => ({
  processSelectionWithAI: (...args: unknown[]) => mockProcessSelectionWithAI(...args),
}));

describe('useSkillAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a stable function reference', () => {
    const { result, rerender } = renderHook(() => useSkillAI());
    const first = result.current;
    rerender();
    const second = result.current;
    expect(first).toBe(second);
  });

  it('calls processSelectionWithAI with rewrite action', async () => {
    mockProcessSelectionWithAI.mockResolvedValueOnce({
      success: true,
      result: 'AI generated text',
    });

    const { result } = renderHook(() => useSkillAI());
    const output = await result.current('Test prompt');

    expect(mockProcessSelectionWithAI).toHaveBeenCalledWith({
      action: 'rewrite',
      text: 'Test prompt',
      customPrompt: 'Test prompt',
    });
    expect(output).toBe('AI generated text');
  });

  it('throws error on failure', async () => {
    mockProcessSelectionWithAI.mockResolvedValueOnce({
      success: false,
      error: 'Something went wrong',
    });

    const { result } = renderHook(() => useSkillAI());

    await expect(result.current('Test prompt')).rejects.toThrow('Something went wrong');
  });

  it('throws generic error when no error message provided', async () => {
    mockProcessSelectionWithAI.mockResolvedValueOnce({
      success: false,
    });

    const { result } = renderHook(() => useSkillAI());

    await expect(result.current('Test prompt')).rejects.toThrow('AI request failed');
  });

  it('throws error when result is null', async () => {
    mockProcessSelectionWithAI.mockResolvedValueOnce({
      success: true,
      result: null,
    });

    const { result } = renderHook(() => useSkillAI());

    await expect(result.current('Test prompt')).rejects.toThrow('AI request failed');
  });
});
