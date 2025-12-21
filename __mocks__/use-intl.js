/* eslint-disable @typescript-eslint/no-require-imports */
// Mock for use-intl ESM module
const React = require('react');

const useFormatter = () => ({
  dateTime: jest.fn((date) => date?.toString() || ''),
  number: jest.fn((num) => num?.toString() || ''),
  relativeTime: jest.fn(() => 'just now'),
});

const useTranslations = () => (key) => key;
const useLocale = () => 'en';
const useMessages = () => ({});
const useNow = () => new Date();
const useTimeZone = () => 'UTC';

const IntlProvider = ({ children }) => React.createElement(React.Fragment, null, children);

module.exports = {
  useFormatter,
  useTranslations,
  useLocale,
  useMessages,
  useNow,
  useTimeZone,
  IntlProvider,
};
