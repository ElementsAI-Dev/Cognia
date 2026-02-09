/* eslint-disable @typescript-eslint/no-require-imports */
// Mock for next-intl ESM module
const React = require('react');
const fs = require('fs');
const path = require('path');

// Load English translations from split files
// The split files are compiled via index.ts, so we load them dynamically
let fileMessages = {};

// Try to load from the compiled split files
const loadSplitMessages = () => {
  const splitDir = path.resolve(__dirname, '..', 'lib', 'i18n', 'messages', 'en');
  const altSplitDir = path.resolve(process.cwd(), 'lib', 'i18n', 'messages', 'en');
  
  const dirsToTry = [splitDir, altSplitDir];
  
  for (const dir of dirsToTry) {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        const combined = {};
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(content);
          Object.assign(combined, parsed);
        }
        
        if (Object.keys(combined).length > 0) {
          return combined;
        }
      }
    } catch {
      // Continue to next path
    }
  }
  
  return {};
};

fileMessages = loadSplitMessages();

// React context to support NextIntlClientProvider passing messages
const IntlContext = React.createContext(null);

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
// It reads from React context (provider messages) first, then falls back to file-based messages
const useTranslations = (namespace) => {
  // Try to read messages from NextIntlClientProvider context
  let activeMessages = fileMessages;
  try {
    const contextMessages = React.useContext(IntlContext);
    if (contextMessages && Object.keys(contextMessages).length > 0) {
      activeMessages = contextMessages;
    }
  } catch {
    // Outside React render — use file-based messages
  }

  const t = (key, params) => {
    // Try to find the translation
    const fullKey = namespace ? `${namespace}.${key}` : key;
    let value = getNestedValue(activeMessages, fullKey);
    
    // If not found with namespace, try just the key
    if (!value) {
      value = getNestedValue(activeMessages, key);
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
    return getNestedValue(activeMessages, fullKey) || key;
  };
  
  return t;
};

const useLocale = () => 'en';
const useMessages = () => fileMessages;
const useNow = () => new Date();
const useTimeZone = () => 'UTC';

// NextIntlClientProvider passes messages to children via React context
const NextIntlClientProvider = ({ children, messages: msgs }) => {
  return React.createElement(IntlContext.Provider, { value: msgs || fileMessages }, children);
};
const IntlProvider = ({ children, messages: msgs }) => {
  return React.createElement(IntlContext.Provider, { value: msgs || fileMessages }, children);
};

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
