/**
 * @jest-environment jsdom
 */


import { RecordingModeContent } from './recording-mode';

describe('recording-mode module', () => {
  it('exports RecordingModeContent', () => {
    expect(RecordingModeContent).toBeDefined();
    expect(typeof RecordingModeContent).toBe('function');
  });
});
