/**
 * @jest-environment jsdom
 */


import DefaultExport from './page';

describe('page module', () => {
  it('exports default symbol', () => {
    expect(DefaultExport).toBeDefined();
    expect(typeof DefaultExport).toBe('function');
  });
});
