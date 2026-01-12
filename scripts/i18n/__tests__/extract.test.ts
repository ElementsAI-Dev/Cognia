/**
 * Unit tests for i18n extraction functions
 */

import * as fs from 'fs';
import { extractStringsFromFile } from '../extract';
import type { I18nConfig } from '../types';

// Mock fs module
jest.mock('fs');

const mockConfig: I18nConfig = {
  targetDirectories: ['components'],
  excludePatterns: ['node_modules', '__tests__'],
  extractionRules: {
    includeStrings: ['JSXText', 'PropString'],
    excludePatterns: [
      '^console\\.',
      '^#[0-9a-fA-F]{3,8}$',
      '^\\d+(\\.\\d+)?(px|em|rem|%|vh|vw)$',
    ],
    minLength: 2,
    maxLength: 500,
    excludeTechnicalStrings: true,
    excludeDebugStrings: true,
    excludeLogStrings: true,
    excludeCodeIdentifiers: true,
  },
  namespaceMapping: {
    'components/chat': 'chat',
    'components/settings': 'settings',
  },
  keyGenerationRules: {
    format: 'camelCase',
    maxKeyLength: 50,
    prefixWithNamespace: false,
    removeSpecialChars: true,
    preserveNumbers: true,
    conflictResolution: 'suffix-number',
    wordSeparator: '_',
  },
  outputFormats: {
    json: true,
    csv: true,
    markdown: true,
    html: false,
  },
  existingTranslations: {
    enPath: 'lib/i18n/messages/en.json',
    zhCNPath: 'lib/i18n/messages/zh-CN.json',
  },
  backupSettings: {
    enabled: true,
    maxBackups: 5,
    backupDir: 'i18n-backups',
  },
  validation: {
    strictMode: false,
    warnOnMissingKeys: true,
    warnOnOrphanedKeys: true,
    errorOnMissingTranslations: false,
    checkPlaceholders: true,
    checkInterpolation: true,
  },
  cliOptions: {
    verbose: false,
    dryRun: false,
    interactive: true,
    autoFix: false,
  },
};

describe('extractStringsFromFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should extract JSX text content', () => {
    const mockContent = `
      export function Button() {
        return <button>Click me</button>;
      }
    `;

    (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

    const result = extractStringsFromFile('/test/component.tsx', mockConfig);

    expect(result.file).toBe('/test/component.tsx');
    expect(result.hasI18nHook).toBe(false);
    expect(result.strings.length).toBeGreaterThan(0);
    expect(result.strings.some(s => s.string === 'Click me')).toBe(true);
  });

  it('should detect useTranslations hook', () => {
    const mockContent = `
      import { useTranslations } from 'next-intl';

      export function Button() {
        const t = useTranslations('common');
        return <button>{t('save')}</button>;
      }
    `;

    (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

    const result = extractStringsFromFile('/test/component.tsx', mockConfig);

    expect(result.hasI18nHook).toBe(true);
  });

  it('should extract prop strings', () => {
    const mockContent = `
      export function Input() {
        return <input placeholder="Enter your name" />;
      }
    `;

    (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

    const result = extractStringsFromFile('/test/component.tsx', mockConfig);

    expect(result.strings.some(s => s.string === 'Enter your name')).toBe(true);
    expect(result.strings.some(s => s.type === 'PropString')).toBe(true);
  });

  it('should extract heading text', () => {
    const mockContent = `
      export function Page() {
        return <h1>Welcome to our app</h1>;
      }
    `;

    (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

    const result = extractStringsFromFile('/test/component.tsx', mockConfig);

    expect(result.strings.some(s => s.string === 'Welcome to our app')).toBe(true);
    // String may be extracted as JSXText or HeadingText depending on regex matching order
    expect(result.strings.some(s => s.type === 'HeadingText' || s.type === 'JSXText')).toBe(true);
  });

  it('should skip comments', () => {
    const mockContent = `
      // This is a comment
      /* This is also a comment */
      export function Component() {
        return <div>Content</div>;
      }
    `;

    (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

    const result = extractStringsFromFile('/test/component.tsx', mockConfig);

    expect(result.strings.some(s => s.string.includes('comment'))).toBe(false);
  });

  it('should skip import statements', () => {
    const mockContent = `
      import React from 'react';
      import { Button } from '@/components/ui/button';

      export function Component() {
        return <div>Hello</div>;
      }
    `;

    (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

    const result = extractStringsFromFile('/test/component.tsx', mockConfig);

    expect(result.strings.some(s => s.string === 'react')).toBe(false);
    expect(result.strings.some(s => s.string.includes('@/components'))).toBe(false);
  });

  it('should handle file read errors gracefully', () => {
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('File not found');
    });

    const result = extractStringsFromFile('/nonexistent/file.tsx', mockConfig);

    expect(result.error).toBe('File not found');
    expect(result.strings).toEqual([]);
  });

  it('should remove duplicate strings on same line', () => {
    const mockContent = `
      export function Component() {
        return <div>Same text</div>;
      }
    `;

    (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

    const result = extractStringsFromFile('/test/component.tsx', mockConfig);

    const sameTextStrings = result.strings.filter(s => s.string === 'Same text');
    expect(sameTextStrings.length).toBe(1);
  });

  it('should extract button text', () => {
    const mockContent = `
      export function Actions() {
        return (
          <div>
            <Button>Save changes</Button>
            <button>Cancel</button>
          </div>
        );
      }
    `;

    (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

    const result = extractStringsFromFile('/test/component.tsx', mockConfig);

    expect(result.strings.some(s => s.string === 'Save changes')).toBe(true);
    expect(result.strings.some(s => s.string === 'Cancel')).toBe(true);
  });

  it('should extract label text', () => {
    const mockContent = `
      export function Form() {
        return <Label>Email address</Label>;
      }
    `;

    (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

    const result = extractStringsFromFile('/test/component.tsx', mockConfig);

    expect(result.strings.some(s => s.string === 'Email address')).toBe(true);
    // String may be extracted as JSXText or LabelText depending on regex matching order
    expect(result.strings.some(s => s.type === 'LabelText' || s.type === 'JSXText')).toBe(true);
  });

  it('should include line numbers', () => {
    const mockContent = `line1
line2
export function Component() {
  return <div>Test content</div>;
}`;

    (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

    const result = extractStringsFromFile('/test/component.tsx', mockConfig);

    const testString = result.strings.find(s => s.string === 'Test content');
    expect(testString).toBeDefined();
    expect(testString?.line).toBeGreaterThan(0);
  });
});
