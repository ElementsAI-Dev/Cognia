/**
 * Accessibility Plugin - Built-in plugin for accessibility analysis
 * Checks WCAG compliance and provides accessibility suggestions
 */

import type { DesignerPlugin, PluginContext, PluginResult } from './plugin-system';
import { detectAccessibilityIssues } from '../ai-analyzer';

export interface AccessibilityIssue {
  type: string;
  severity: 'error' | 'warning' | 'info';
  element: string;
  message: string;
  suggestion: string;
  wcagCriteria?: string;
}

export interface AccessibilityReport {
  score: number;
  issues: AccessibilityIssue[];
  passedChecks: string[];
  summary: string;
}

/**
 * Analyze code for accessibility issues
 */
function analyzeAccessibility(code: string): AccessibilityReport {
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
 * Get WCAG criteria for issue type
 */
function getWCAGCriteria(type: string): string | undefined {
  const criteria: Record<string, string> = {
    'missing-alt': 'WCAG 1.1.1 Non-text Content',
    'missing-label': 'WCAG 1.3.1 Info and Relationships',
    'low-contrast': 'WCAG 1.4.3 Contrast (Minimum)',
    'missing-role': 'WCAG 4.1.2 Name, Role, Value',
    'keyboard-trap': 'WCAG 2.1.2 No Keyboard Trap',
  };
  return criteria[type];
}

/**
 * Create the accessibility plugin
 */
export function createAccessibilityPlugin(): DesignerPlugin {
  return {
    id: 'accessibility',
    name: 'Accessibility Checker',
    version: '1.0.0',
    description: 'Analyzes components for WCAG accessibility compliance',
    author: 'Cognia',
    category: 'analysis',
    enabled: true,
    hooks: {
      afterEdit: async (context: PluginContext): Promise<PluginResult<AccessibilityReport>> => {
        const report = analyzeAccessibility(context.code);
        
        if (report.issues.length > 0) {
          const errors = report.issues.filter((i) => i.severity === 'error');
          if (errors.length > 0) {
            context.showNotification(
              `${errors.length} accessibility error(s) found`,
              'warning'
            );
          }
        }
        
        return { success: true, data: report };
      },
    },
    actions: [
      {
        id: 'run-accessibility-check',
        label: 'Run Accessibility Check',
        icon: 'accessibility',
        shortcut: 'Ctrl+Shift+A',
        execute: async (context: PluginContext): Promise<PluginResult<AccessibilityReport>> => {
          const report = analyzeAccessibility(context.code);
          
          context.showNotification(
            `Accessibility score: ${report.score}/100`,
            report.score >= 80 ? 'success' : report.score >= 50 ? 'warning' : 'error'
          );
          
          return { success: true, data: report };
        },
      },
      {
        id: 'fix-accessibility-issues',
        label: 'Auto-fix Accessibility Issues',
        icon: 'wand',
        execute: async (context: PluginContext): Promise<PluginResult> => {
          let modifiedCode = context.code;
          let fixCount = 0;

          // Auto-fix: Add empty alt to images without alt
          if (modifiedCode.includes('<img') && !modifiedCode.includes('alt=')) {
            modifiedCode = modifiedCode.replace(/<img([^>]*)>/g, '<img$1 alt="">');
            fixCount++;
          }

          // Auto-fix: Add role="button" to clickable divs
          modifiedCode = modifiedCode.replace(
            /<div([^>]*onClick[^>]*)(?!role=)/g,
            '<div$1 role="button" tabIndex={0}'
          );

          if (modifiedCode !== context.code) {
            context.updateCode(modifiedCode);
            context.showNotification(`Fixed ${fixCount} accessibility issue(s)`, 'success');
            return {
              success: true,
              modifications: { code: modifiedCode },
            };
          }

          context.showNotification('No auto-fixable issues found', 'info');
          return { success: true };
        },
      },
    ],
    settings: [
      {
        id: 'autoCheck',
        label: 'Auto-check on edit',
        type: 'boolean',
        default: true,
      },
      {
        id: 'severityLevel',
        label: 'Minimum severity to report',
        type: 'select',
        default: 'warning',
        options: [
          { label: 'Errors only', value: 'error' },
          { label: 'Warnings and above', value: 'warning' },
          { label: 'All issues', value: 'info' },
        ],
      },
    ],
  };
}

export default createAccessibilityPlugin;
