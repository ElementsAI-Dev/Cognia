/**
 * @jest-environment jsdom
 */


import DefaultExport from './tutorial-detail-client';

describe('tutorial-detail-client module', () => {
  it('exports default symbol', () => {
    expect(DefaultExport).toBeDefined();
    expect(typeof DefaultExport).toBe('function');
  });
});
