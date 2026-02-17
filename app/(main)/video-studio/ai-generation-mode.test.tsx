/**
 * @jest-environment jsdom
 */


import { AIGenerationModeContent } from './ai-generation-mode';

describe('ai-generation-mode module', () => {
  it('exports AIGenerationModeContent', () => {
    expect(AIGenerationModeContent).toBeDefined();
    expect(typeof AIGenerationModeContent).toBe('function');
  });
});
