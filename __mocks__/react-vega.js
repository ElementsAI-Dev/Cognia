/**
 * Mock for react-vega ESM module
 * Stubs VegaEmbed and other exports for Jest test environment
 */

const React = jest.requireActual('react');

const VegaEmbed = React.forwardRef(function VegaEmbed(props, ref) {
  return React.createElement('div', {
    ref,
    'data-testid': 'mock-vega-embed',
    'data-spec': JSON.stringify(props.spec),
  });
});
VegaEmbed.displayName = 'VegaEmbed';

const Vega = React.forwardRef(function Vega(props, ref) {
  return React.createElement('div', {
    ref,
    'data-testid': 'mock-vega',
  });
});
Vega.displayName = 'Vega';

const VegaLite = React.forwardRef(function VegaLite(props, ref) {
  return React.createElement('div', {
    ref,
    'data-testid': 'mock-vega-lite',
  });
});
VegaLite.displayName = 'VegaLite';

module.exports = {
  VegaEmbed,
  Vega,
  VegaLite,
  createClassFromSpec: () => VegaEmbed,
};
