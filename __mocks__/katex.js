/**
 * Mock for katex ESM module
 */

const katex = {
  render: function(math, element, _options) {
    if (element) {
      element.innerHTML = `<span class="katex">${math}</span>`;
    }
  },
  renderToString: function(math, _options) {
    return `<span class="katex">${math}</span>`;
  },
  __parse: function() { return {}; },
  __renderToDomTree: function() { return {}; },
  __renderToHTMLTree: function() { return {}; },
};

module.exports = katex;
module.exports.default = katex;
