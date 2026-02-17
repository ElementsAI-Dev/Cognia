/**
 * @jest-environment jsdom
 */


import { StandaloneSelectionToolbar } from './standalone-toolbar';

describe('standalone-toolbar module', () => {
  it('exports StandaloneSelectionToolbar', () => {
    expect(StandaloneSelectionToolbar).toBeDefined();
    expect(typeof StandaloneSelectionToolbar).toBe('function');
  });
});
