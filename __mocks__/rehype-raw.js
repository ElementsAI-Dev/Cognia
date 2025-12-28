/**
 * Mock for rehype-raw ESM module
 */

function rehypeRaw() {
  return function transformer(tree) {
    return tree;
  };
}

module.exports = rehypeRaw;
module.exports.default = rehypeRaw;
