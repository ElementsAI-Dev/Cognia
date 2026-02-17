/**
 * @jest-environment jsdom
 */


import DefaultExport from './session-detail-client';

describe('session-detail-client module', () => {
  it('exports default symbol', () => {
    expect(DefaultExport).toBeDefined();
    expect(typeof DefaultExport).toBe('function');
  });
});
