/**
 * Mock for ink-spinner package
 */

const React = require('react');

const Spinner = ({ type }) => {
  return React.createElement('span', null, '⠋');
};

module.exports = Spinner;
module.exports.default = Spinner;
