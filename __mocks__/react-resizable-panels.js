/* eslint-disable @typescript-eslint/no-require-imports */
// Mock for react-resizable-panels ESM module
const React = require('react');

const Panel = ({ children, className, ...props }) => 
  React.createElement('div', { 'data-testid': 'panel', className, ...props }, children);

const PanelGroup = ({ children, className, ...props }) => 
  React.createElement('div', { 'data-testid': 'panel-group', className, ...props }, children);

const PanelResizeHandle = ({ className, ...props }) => 
  React.createElement('div', { 'data-testid': 'panel-resize-handle', className, ...props });

module.exports = {
  Panel,
  PanelGroup,
  PanelResizeHandle,
};
