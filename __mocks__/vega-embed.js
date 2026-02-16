/**
 * Mock for vega-embed ESM module
 * Stubs embed function for Jest test environment
 */

const embed = async () => ({
  view: {
    run: () => {},
    finalize: () => {},
    toImageURL: async () => 'data:image/png;base64,mock',
    toSVG: async () => '<svg></svg>',
    signal: () => {},
    addSignalListener: () => {},
    removeSignalListener: () => {},
    width: () => 400,
    height: () => 300,
  },
  spec: {},
  vgSpec: {},
});

embed.default = embed;

module.exports = embed;
module.exports.default = embed;
