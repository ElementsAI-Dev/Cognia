const React = require('react');

function passthrough(children) {
  return React.createElement(React.Fragment, null, children ?? null);
}

module.exports = {
  Alert: ({ children }) => passthrough(children),
  StatusMessage: ({ children }) => passthrough(children),
  ProgressBar: ({ children, value }) =>
    passthrough(children ?? `Progress: ${typeof value === 'number' ? value : 0}`),
};
