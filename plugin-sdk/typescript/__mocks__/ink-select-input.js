/**
 * Mock for ink-select-input package
 */

const React = require('react');

const SelectInput = ({ items, onSelect }) => {
  return React.createElement('select', null, 
    items?.map((item, i) => React.createElement('option', { key: i }, item.label))
  );
};

module.exports = SelectInput;
module.exports.default = SelectInput;
