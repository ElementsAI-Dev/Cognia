/* eslint-disable @typescript-eslint/no-require-imports, react/display-name */
// Mock for use-stick-to-bottom ESM module
const React = require('react');

const StickToBottom = ({ children }) => React.createElement('div', { 'data-testid': 'stick-to-bottom' }, children);
StickToBottom.Content = ({ children, className }) => React.createElement('div', { className, 'data-testid': 'stick-to-bottom-content' }, children);
StickToBottom.Scroller = ({ children, className }) => React.createElement('div', { className, 'data-testid': 'stick-to-bottom-scroller' }, children);

const useStickToBottom = () => ({
  isAtBottom: true,
  scrollToBottom: jest.fn(),
  contentRef: { current: null },
  scrollerRef: { current: null },
});

module.exports = {
  StickToBottom,
  useStickToBottom,
};
