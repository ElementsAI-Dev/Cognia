/**
 * Designer Plugins - Accessibility analysis utilities
 * 
 * Note: The previous custom plugin system has been removed.
 * Use the main plugin system at lib/plugin/ for extensibility.
 */

export {
  type AccessibilityIssue,
  type AccessibilityReport,
  analyzeAccessibility,
  autoFixAccessibilityIssues,
  getWCAGCriteria,
} from './accessibility-plugin';
