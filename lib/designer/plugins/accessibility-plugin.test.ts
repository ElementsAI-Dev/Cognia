/**
 * Accessibility Plugin Utilities Tests
 */

import {
  analyzeAccessibility,
  autoFixAccessibilityIssues,
  getWCAGCriteria,
} from './accessibility-plugin';

describe('Accessibility Plugin Utilities', () => {
  describe('getWCAGCriteria', () => {
    it('should return WCAG criteria for known issue types', () => {
      expect(getWCAGCriteria('missing-alt')).toBe('WCAG 1.1.1 Non-text Content');
      expect(getWCAGCriteria('missing-label')).toBe('WCAG 1.3.1 Info and Relationships');
      expect(getWCAGCriteria('low-contrast')).toBe('WCAG 1.4.3 Contrast (Minimum)');
      expect(getWCAGCriteria('missing-role')).toBe('WCAG 4.1.2 Name, Role, Value');
      expect(getWCAGCriteria('keyboard-trap')).toBe('WCAG 2.1.2 No Keyboard Trap');
    });

    it('should return undefined for unknown issue types', () => {
      expect(getWCAGCriteria('unknown-type')).toBeUndefined();
    });
  });

  describe('analyzeAccessibility', () => {
    it('should return perfect score for accessible code', () => {
      const code = `
        <img src="photo.jpg" alt="A photo" />
        <button aria-label="Submit">Submit</button>
        <label htmlFor="input">Name</label>
        <input id="input" type="text" />
      `;

      const report = analyzeAccessibility(code);

      expect(report.score).toBe(100);
      expect(report.issues).toHaveLength(0);
      expect(report.passedChecks).toContain('Images have alt attributes');
      expect(report.passedChecks).toContain('ARIA labels present');
      expect(report.passedChecks).toContain('Form labels present');
    });

    it('should detect missing alt attribute', () => {
      const code = '<img src="photo.jpg" />';

      const report = analyzeAccessibility(code);

      expect(report.score).toBeLessThan(100);
      expect(report.issues.some((i) => i.type === 'missing-alt')).toBe(true);
    });

    it('should detect clickable div without role', () => {
      const code = '<div onClick={handleClick}>Click me</div>';

      const report = analyzeAccessibility(code);

      expect(report.issues.some((i) => i.type === 'missing-role')).toBe(true);
    });

    it('should include WCAG criteria in issues', () => {
      const code = '<img src="photo.jpg" />';

      const report = analyzeAccessibility(code);
      const altIssue = report.issues.find((i) => i.type === 'missing-alt');

      expect(altIssue?.wcagCriteria).toBe('WCAG 1.1.1 Non-text Content');
    });

    it('should generate correct summary', () => {
      const accessibleCode = '<img src="photo.jpg" alt="Photo" />';
      const inaccessibleCode = '<img src="photo.jpg" />';

      const accessibleReport = analyzeAccessibility(accessibleCode);
      const inaccessibleReport = analyzeAccessibility(inaccessibleCode);

      expect(accessibleReport.summary).toContain('No accessibility issues found');
      expect(inaccessibleReport.summary).toContain('Found');
    });
  });

  describe('autoFixAccessibilityIssues', () => {
    it('should add empty alt to images without alt', () => {
      const code = '<img src="photo.jpg">';

      const result = autoFixAccessibilityIssues(code);

      expect(result.code).toContain('alt=""');
      expect(result.fixCount).toBeGreaterThan(0);
    });

    it('should add role and tabIndex to clickable divs', () => {
      const code = '<div onClick={handleClick}>Click</div>';

      const result = autoFixAccessibilityIssues(code);

      expect(result.code).toContain('role="button"');
      expect(result.code).toContain('tabIndex={0}');
    });

    it('should not modify already accessible code', () => {
      const code = '<img src="photo.jpg" alt="Photo" />';

      const result = autoFixAccessibilityIssues(code);

      expect(result.code).toBe(code);
      expect(result.fixCount).toBe(0);
    });
  });
});
