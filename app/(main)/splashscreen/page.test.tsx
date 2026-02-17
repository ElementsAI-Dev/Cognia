/**
 * @jest-environment jsdom
 */

jest.mock('@/components/ui/neural-particles', () => ({
  NeuralParticles: () => null,
}));

jest.mock('@/components/ui/ai-logo-animation', () => ({
  AILogoAnimation: () => null,
}));
import DefaultExport from './page';

describe('page module', () => {
  it('exports default symbol', () => {
    expect(DefaultExport).toBeDefined();
    expect(typeof DefaultExport).toBe('function');
  });
});
