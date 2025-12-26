// Mock for rehype-sanitize ESM module
module.exports = {
  default: function rehypeSanitize() {
    return function (tree) {
      return tree;
    };
  },
  defaultSchema: {
    tagNames: [],
    attributes: {},
  },
};
