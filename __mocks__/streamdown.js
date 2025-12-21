/* eslint-disable @typescript-eslint/no-require-imports */
// Mock for streamdown ESM module
const React = require('react');

const Streamdown = ({ children, content }) => {
  return React.createElement('div', { 'data-testid': 'streamdown' }, content || children);
};

module.exports = {
  Streamdown,
};
