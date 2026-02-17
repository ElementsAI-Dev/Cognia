/**
 * @jest-environment jsdom
 */


import DefaultExport, { dynamicParams, generateStaticParams } from './page';

describe('page module', () => {
  it('exports default symbol', () => {
    expect(DefaultExport).toBeDefined();
    expect(typeof DefaultExport).toBe('function');
  });
  it('exports dynamicParams', () => {
    expect(typeof dynamicParams).toBe('boolean');
  });
  it('exports generateStaticParams result array', async () => {
    const params = await generateStaticParams();
    expect(Array.isArray(params)).toBe(true);
  });
});
