/**
 * Accessibility Analysis Utilities
 * Provides WCAG compliance checking and accessibility scoring
 * 
 * Note: This module provides standalone utility functions.
 * The previous plugin system has been removed in favor of direct function calls.
 */

import { detectAccessibilityIssues, type AccessibilityIssue } from '../ai';

export type { AccessibilityIssue };

export interface AccessibilityReport {
  score: number;
  issues: Array<AccessibilityIssue & { wcagCriteria?: string }>;
  passedChecks: string[];
  summary: string;
}

/**
 * WCAG criteria mapping for issue types
 */
const WCAG_CRITERIA: Record<string, string> = {
  'missing-alt': 'WCAG 1.1.1 Non-text Content',
  'missing-label': 'WCAG 1.3.1 Info and Relationships',
  'low-contrast': 'WCAG 1.4.3 Contrast (Minimum)',
  'missing-role': 'WCAG 4.1.2 Name, Role, Value',
  'keyboard-trap': 'WCAG 2.1.2 No Keyboard Trap',
};

/**
 * Get WCAG criteria for issue type
 */
export function getWCAGCriteria(type: string): string | undefined {
  return WCAG_CRITERIA[type];
}

/**
 * Analyze code for accessibility issues and generate a comprehensive report
 */
export function analyzeAccessibility(code: string): AccessibilityReport {
  const issues = detectAccessibilityIssues(code);
  const passedChecks: string[] = [];

  // Check for common accessibility patterns
  if (code.includes('alt=')) {
    passedChecks.push('Images have alt attributes');
  }
  if (code.includes('aria-label') || code.includes('aria-labelledby')) {
    passedChecks.push('ARIA labels present');
  }
  if (code.includes('<label')) {
    passedChecks.push('Form labels present');
  }
  if (code.includes('role=')) {
    passedChecks.push('ARIA roles defined');
  }
  if (code.includes('tabIndex') || code.includes('tabindex')) {
    passedChecks.push('Tab navigation configured');
  }

  // Calculate score (0-100)
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const score = Math.max(0, 100 - errorCount * 20 - warningCount * 10);

  const summary =
    issues.length === 0
      ? 'No accessibility issues found. Great job!'
      : `Found ${issues.length} accessibility issue(s). ${errorCount} error(s), ${warningCount} warning(s).`;

  return {
    score,
    issues: issues.map((i) => ({
      ...i,
      wcagCriteria: getWCAGCriteria(i.type),
    })),
    passedChecks,
    summary,
  };
}

/**
 * Auto-fix common accessibility issues in code
 * Returns the modified code and count of fixes applied
 */
export function autoFixAccessibilityIssues(code: string): { code: string; fixCount: number } {
  let modifiedCode = code;
  let fixCount = 0;

  // Auto-fix: Add empty alt to images without alt
  if (modifiedCode.includes('<img') && !modifiedCode.includes('alt=')) {
    modifiedCode = modifiedCode.replace(/<img([^>]*)>/g, '<img$1 alt="">');
    fixCount++;
  }

  // Auto-fix: Add role="button" to clickable divs
  const beforeFix = modifiedCode;
  modifiedCode = modifiedCode.replace(
    /<div([^>]*onClick[^>]*)(?!role=)/g,
    '<div$1 role="button" tabIndex={0}'
  );
  if (modifiedCode !== beforeFix) {
    fixCount++;
  }

  return { code: modifiedCode, fixCount };
}
