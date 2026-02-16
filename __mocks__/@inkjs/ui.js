/* eslint-disable @typescript-eslint/no-require-imports */
const React = require('react');

const passthrough = ({ children }) => React.createElement(React.Fragment, null, children);
const alert = ({ title, children }) =>
  React.createElement(React.Fragment, null, title, children);

module.exports = {
  Alert: alert,
  StatusMessage: passthrough,
  ProgressBar: () => null,
};
