/**
 * @jest-environment jsdom
 */

// sources-part.tsx is a wrapper component that uses SourcesDisplay
// Basic existence test - more detailed tests should be in sources-display.test.tsx

describe('SourcesPart', () => {
  it('module exists', async () => {
    const sourcesPart = await import('./sources-part');
    expect(sourcesPart.SourcesPart).toBeDefined();
  });
});
