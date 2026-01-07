/* eslint-disable @typescript-eslint/no-require-imports, react/display-name */
// Mock for use-stick-to-bottom ESM module
const React = require('react');

const StickToBottom = ({ children, ...props }) => React.createElement('div', { 'data-testid': 'stick-to-bottom', ...props }, children);
StickToBottom.Content = ({ children, className }) => React.createElement('div', { className, 'data-testid': 'stick-to-bottom-content' }, children);

const useStickToBottomContext = () => ({
  isAtBottom: true,
  scrollToBottom: jest.fn(),
  stopScroll: jest.fn(),
  escapedFromLock: false,
  state: {},
  targetScrollTop: null,
  contentRef: { current: null },
  scrollRef: { current: null },
});

module.exports = {
  StickToBottom,
  useStickToBottomContext,
};
