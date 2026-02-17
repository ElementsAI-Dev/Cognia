/**
 * @jest-environment jsdom
 */


import DefaultExport, { metadata } from './layout';

describe('layout module', () => {
  it('exports default symbol', () => {
    expect(DefaultExport).toBeDefined();
    expect(typeof DefaultExport).toBe('function');
  });
  it('exports metadata', () => {
    expect(metadata).toBeDefined();
    expect(typeof metadata).toBe('object');
  });
});
