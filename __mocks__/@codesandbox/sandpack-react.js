/* eslint-disable @typescript-eslint/no-require-imports */
// Mock for @codesandbox/sandpack-react ESM module
const React = require('react');

const SandpackProvider = ({ children }) => React.createElement('div', { 'data-testid': 'sandpack-provider' }, children);
const SandpackLayout = ({ children }) => React.createElement('div', { 'data-testid': 'sandpack-layout' }, children);
const SandpackCodeEditor = () => React.createElement('div', { 'data-testid': 'sandpack-code-editor' });
const SandpackPreview = () => React.createElement('div', { 'data-testid': 'sandpack-preview' });
const SandpackConsole = () => React.createElement('div', { 'data-testid': 'sandpack-console' });

const useSandpack = () => ({
  sandpack: {
    files: {},
    activeFile: '',
    updateFile: jest.fn(),
    addFile: jest.fn(),
    deleteFile: jest.fn(),
    openFile: jest.fn(),
  },
  dispatch: jest.fn(),
  listen: jest.fn(),
});

module.exports = {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  useSandpack,
};
