/**
 * Mock for remark-gfm ESM module
 */

function remarkGfm() {
  return function transformer(tree) {
    return tree;
  };
}

module.exports = remarkGfm;
module.exports.default = remarkGfm;
