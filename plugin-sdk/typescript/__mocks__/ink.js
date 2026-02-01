/**
 * Mock for ink package
 */

const React = require('react');

module.exports = {
  Box: ({ children }) => React.createElement('div', null, children),
  Text: ({ children }) => React.createElement('span', null, children),
  useApp: () => ({ exit: jest.fn() }),
  useInput: jest.fn(),
  render: jest.fn(() => ({
    unmount: jest.fn(),
    waitUntilExit: () => Promise.resolve(),
    clear: jest.fn(),
    rerender: jest.fn(),
  })),
  Newline: () => React.createElement('br'),
  Static: ({ children }) => React.createElement('div', null, children),
};
