/**
 * Unit tests for i18n validation functions
 */

import * as fs from 'fs';
import {
  extractUsedKeys,
  hasHardcodedStrings,
  validateTranslationsConsistency,
} from '../validate';
import type { Translations } from '../types';

// Mock fs module
jest.mock('fs');

describe('validate functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractUsedKeys', () => {
    it('should extract t() function calls', () => {
      const mockContent = `
        import { useTranslations } from 'next-intl';

        export function Component() {
          const t = useTranslations('common');
          return (
            <div>
              <span>{t('save')}</span>
              <span>{t('cancel')}</span>
            </div>
          );
        }
      `;

      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const result = extractUsedKeys('/test/component.tsx');

      expect(result.hasI18n).toBe(true);
      expect(result.namespace).toBe('common');
      expect(result.usedKeys.some(k => k.key === 'save')).toBe(true);
      expect(result.usedKeys.some(k => k.key === 'cancel')).toBe(true);
    });

    it('should detect namespace from useTranslations', () => {
      const mockContent = `
        const t = useTranslations('settings');
        return <div>{t('theme')}</div>;
      `;

      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const result = extractUsedKeys('/test/component.tsx');

      expect(result.namespace).toBe('settings');
    });

    it('should return hasI18n false when no useTranslations', () => {
      const mockContent = `
        export function Component() {
          return <div>Hello</div>;
        }
      `;

      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const result = extractUsedKeys('/test/component.tsx');

      expect(result.hasI18n).toBe(false);
      expect(result.namespace).toBeNull();
    });

    it('should include line numbers for each key', () => {
      const mockContent = `line1
line2
const t = useTranslations('common');
const x = t('myKey');`;

      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const result = extractUsedKeys('/test/component.tsx');

      const myKeyUsage = result.usedKeys.find(k => k.key === 'myKey');
      expect(myKeyUsage).toBeDefined();
      expect(myKeyUsage?.line).toBe(4);
    });

    it('should handle file read errors', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = extractUsedKeys('/test/component.tsx');

      expect(result.error).toBe('Permission denied');
      expect(result.usedKeys).toEqual([]);
    });
  });

  describe('hasHardcodedStrings', () => {
    it('should detect hardcoded text in JSX', () => {
      const mockContent = `
        export function Component() {
          return <div>This is hardcoded text</div>;
        }
      `;

      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const result = hasHardcodedStrings('/test/component.tsx');

      expect(result.hasHardcoded).toBe(true);
      expect(result.count).toBeGreaterThan(0);
    });

    it('should not flag numbers as hardcoded', () => {
      const mockContent = `
        export function Component() {
          return <div>123456</div>;
        }
      `;

      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const result = hasHardcodedStrings('/test/component.tsx');

      expect(result.hasHardcoded).toBe(false);
    });

    it('should not flag short strings', () => {
      const mockContent = `
        export function Component() {
          return <div>Hi</div>;
        }
      `;

      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const result = hasHardcodedStrings('/test/component.tsx');

      expect(result.hasHardcoded).toBe(false);
    });

    it('should not flag code-like strings', () => {
      const mockContent = `
        export function Component() {
          return <div>() => value</div>;
        }
      `;

      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const result = hasHardcodedStrings('/test/component.tsx');

      expect(result.hasHardcoded).toBe(false);
    });

    it('should return samples of hardcoded strings', () => {
      const mockContent = `
        export function Component() {
          return (
            <div>
              <span>First hardcoded string</span>
              <span>Second hardcoded string</span>
            </div>
          );
        }
      `;

      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const result = hasHardcodedStrings('/test/component.tsx');

      expect(result.samples).toBeDefined();
      expect(result.samples?.length).toBeGreaterThan(0);
    });

    it('should handle file read errors', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = hasHardcodedStrings('/test/component.tsx');

      expect(result.hasHardcoded).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });

  describe('validateTranslationsConsistency', () => {
    it('should find missing keys in zh-CN', () => {
      const enTranslations: Translations = {
        common: {
          save: 'Save',
          cancel: 'Cancel',
          delete: 'Delete',
        },
      };

      const zhTranslations: Translations = {
        common: {
          save: '保存',
          cancel: '取消',
        },
      };

      const issues = validateTranslationsConsistency(enTranslations, zhTranslations);

      const missingIssues = issues.filter(i => i.type === 'missing-zh');
      expect(missingIssues.length).toBe(1);
      expect(missingIssues[0].key).toBe('common.delete');
      expect(missingIssues[0].severity).toBe('error');
    });

    it('should find extra keys in zh-CN', () => {
      const enTranslations: Translations = {
        common: {
          save: 'Save',
        },
      };

      const zhTranslations: Translations = {
        common: {
          save: '保存',
          extra: '额外的',
        },
      };

      const issues = validateTranslationsConsistency(enTranslations, zhTranslations);

      const extraIssues = issues.filter(i => i.type === 'extra-zh');
      expect(extraIssues.length).toBe(1);
      expect(extraIssues[0].key).toBe('common.extra');
      expect(extraIssues[0].severity).toBe('warning');
    });

    it('should return no issues when translations match', () => {
      const enTranslations: Translations = {
        common: {
          save: 'Save',
          cancel: 'Cancel',
        },
      };

      const zhTranslations: Translations = {
        common: {
          save: '保存',
          cancel: '取消',
        },
      };

      const issues = validateTranslationsConsistency(enTranslations, zhTranslations);

      expect(issues.length).toBe(0);
    });

    it('should handle nested translations', () => {
      const enTranslations: Translations = {
        settings: {
          theme: {
            light: 'Light',
            dark: 'Dark',
          } as unknown as string,
        },
      };

      const zhTranslations: Translations = {
        settings: {
          theme: {
            light: '浅色',
          } as unknown as string,
        },
      };

      const issues = validateTranslationsConsistency(enTranslations, zhTranslations);

      const missingIssues = issues.filter(i => i.type === 'missing-zh');
      expect(missingIssues.some(i => i.key === 'settings.theme.dark')).toBe(true);
    });

    it('should handle empty translations', () => {
      const issues = validateTranslationsConsistency({}, {});
      expect(issues.length).toBe(0);
    });

    it('should include english value in missing-zh issues', () => {
      const enTranslations: Translations = {
        common: {
          submit: 'Submit form',
        },
      };

      const zhTranslations: Translations = {};

      const issues = validateTranslationsConsistency(enTranslations, zhTranslations);

      const missingIssue = issues.find(i => i.key === 'common.submit');
      expect(missingIssue?.english).toBe('Submit form');
    });

    it('should include chinese value in extra-zh issues', () => {
      const enTranslations: Translations = {};

      const zhTranslations: Translations = {
        common: {
          orphan: '孤立的键',
        },
      };

      const issues = validateTranslationsConsistency(enTranslations, zhTranslations);

      const extraIssue = issues.find(i => i.key === 'common.orphan');
      expect(extraIssue?.chinese).toBe('孤立的键');
    });
  });
});
