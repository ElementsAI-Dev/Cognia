/* eslint-disable @typescript-eslint/no-require-imports */
// Mock for next-intl ESM module
const React = require('react');
const fs = require('fs');
const path = require('path');

// Load English translations - try multiple path resolution strategies
let messages = {};
const pathsToTry = [
  path.resolve(__dirname, '..', 'lib', 'i18n', 'messages', 'en.json'),
  path.resolve(process.cwd(), 'lib', 'i18n', 'messages', 'en.json'),
  path.join(__dirname, '..', 'lib', 'i18n', 'messages', 'en.json'),
];

for (const messagesPath of pathsToTry) {
  try {
    if (fs.existsSync(messagesPath)) {
      const content = fs.readFileSync(messagesPath, 'utf-8');
      messages = JSON.parse(content);
      // Verify load was successful
      if (Object.keys(messages).length > 0) {
        break;
      }
    }
  } catch {
    // Continue to next path
  }
}

// Helper to get nested value from object
const getNestedValue = (obj, keyPath) => {
  const keys = keyPath.split('.');
  let value = obj;
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return null;
    }
  }
  return typeof value === 'string' ? value : null;
};

const useFormatter = () => ({
  dateTime: jest.fn((date) => date?.toString() || ''),
  number: jest.fn((num) => num?.toString() || ''),
  relativeTime: jest.fn(() => 'just now'),
});

// useTranslations returns a function that looks up translations
const useTranslations = (namespace) => {
  const t = (key, params) => {
    // Try to find the translation
    const fullKey = namespace ? `${namespace}.${key}` : key;
    let value = getNestedValue(messages, fullKey);
    
    // If not found with namespace, try just the key
    if (!value) {
      value = getNestedValue(messages, key);
    }
    
    // If still not found, return the key
    if (!value) {
      return key;
    }
    
    // Handle interpolation like {count}, {name}, etc.
    if (params && typeof value === 'string') {
      return value.replace(/\{(\w+)\}/g, (match, paramName) => {
        return params[paramName] !== undefined ? String(params[paramName]) : match;
      });
    }
    
    return value;
  };
  
  // Add raw method for accessing nested keys
  t.raw = (key) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return getNestedValue(messages, fullKey) || key;
  };
  
  return t;
};

const useLocale = () => 'en';
const useMessages = () => messages;
const useNow = () => new Date();
const useTimeZone = () => 'UTC';

const NextIntlClientProvider = ({ children }) => React.createElement(React.Fragment, null, children);
const IntlProvider = ({ children }) => React.createElement(React.Fragment, null, children);

module.exports = {
  useFormatter,
  useTranslations,
  useLocale,
  useMessages,
  useNow,
  useTimeZone,
  NextIntlClientProvider,
  IntlProvider,
};
