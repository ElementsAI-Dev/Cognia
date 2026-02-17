/**
 * @jest-environment jsdom
 */


import { SandboxEditor } from './sandbox-editor';

describe('sandbox-editor module', () => {
  it('exports SandboxEditor', () => {
    expect(SandboxEditor).toBeDefined();
    expect(typeof SandboxEditor).toBe('function');
  });
});
