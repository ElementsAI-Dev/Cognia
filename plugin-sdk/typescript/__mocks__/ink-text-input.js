/**
 * Mock for ink-text-input package
 */

const React = require('react');

const TextInput = ({ value, onChange, onSubmit, placeholder }) => {
  return React.createElement('input', { value, placeholder });
};

module.exports = TextInput;
module.exports.default = TextInput;
