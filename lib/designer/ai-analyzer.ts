/**
 * AI Analyzer - AST-based code analysis with pattern recognition
 * Provides intelligent suggestions based on code structure analysis
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { getProviderModel } from '@/lib/ai/core/client';
import type { DesignerAIConfig, AISuggestion } from './ai';

export interface CodePattern {
  type: 'component' | 'hook' | 'utility' | 'layout' | 'form' | 'list';
  confidence: number;
  location: {
    startLine: number;
    endLine: number;
  };
  details: Record<string, unknown>;
}

export interface AccessibilityIssue {
  type: 'missing-alt' | 'missing-label' | 'low-contrast' | 'missing-role' | 'keyboard-trap';
  severity: 'error' | 'warning' | 'info';
  element: string;
  message: string;
  suggestion: string;
}

export interface ResponsiveIssue {
  type: 'fixed-width' | 'missing-breakpoint' | 'touch-target' | 'overflow';
  element: string;
  message: string;
  suggestion: string;
}

export interface CodeAnalysisResult {
  patterns: CodePattern[];
  accessibility: AccessibilityIssue[];
  responsive: ResponsiveIssue[];
  suggestions: AISuggestion[];
  summary: string;
}

const analysisResultSchema = z.object({
  patterns: z.array(z.object({
    type: z.enum(['component', 'hook', 'utility', 'layout', 'form', 'list']),
    confidence: z.number().min(0).max(1),
    location: z.object({
      startLine: z.number(),
      endLine: z.number(),
    }),
    details: z.record(z.unknown()),
  })),
  accessibility: z.array(z.object({
    type: z.enum(['missing-alt', 'missing-label', 'low-contrast', 'missing-role', 'keyboard-trap']),
    severity: z.enum(['error', 'warning', 'info']),
    element: z.string(),
    message: z.string(),
    suggestion: z.string(),
  })),
  responsive: z.array(z.object({
    type: z.enum(['fixed-width', 'missing-breakpoint', 'touch-target', 'overflow']),
    element: z.string(),
    message: z.string(),
    suggestion: z.string(),
  })),
  suggestions: z.array(z.object({
    type: z.enum(['style', 'layout', 'accessibility', 'responsive', 'content']),
    title: z.string(),
    description: z.string(),
    code: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']),
  })),
  summary: z.string(),
});

const ANALYSIS_SYSTEM_PROMPT = `You are an expert code analyzer specializing in React components and UI/UX best practices.

Analyze the provided React component and identify:

1. **Code Patterns**: Identify component patterns (form, list, layout, etc.)
2. **Accessibility Issues**: Check for WCAG compliance issues
3. **Responsive Design Issues**: Check for mobile-first design problems
4. **Improvement Suggestions**: Provide actionable suggestions

Be thorough but practical. Focus on issues that have real impact on users.

Return a structured analysis with all findings.`;

/**
 * Detect patterns in code using simple heuristics
 */
export function detectPatternsSimple(code: string): CodePattern[] {
  const patterns: CodePattern[] = [];
  const lines = code.split('\n');

  // Detect form patterns
  if (code.includes('<form') || code.includes('<input') || code.includes('<button type="submit"')) {
    patterns.push({
      type: 'form',
      confidence: 0.9,
      location: { startLine: 1, endLine: lines.length },
      details: {
        hasForm: code.includes('<form'),
        hasInput: code.includes('<input'),
        hasSubmit: code.includes('type="submit"'),
      },
    });
  }

  // Detect list patterns
  if (code.includes('.map(') && (code.includes('<li') || code.includes('<div'))) {
    patterns.push({
      type: 'list',
      confidence: 0.85,
      location: { startLine: 1, endLine: lines.length },
      details: {
        hasMap: true,
        usesKey: code.includes('key='),
      },
    });
  }

  // Detect layout patterns
  if (code.includes('flex') || code.includes('grid')) {
    patterns.push({
      type: 'layout',
      confidence: 0.8,
      location: { startLine: 1, endLine: lines.length },
      details: {
        usesFlex: code.includes('flex'),
        usesGrid: code.includes('grid'),
      },
    });
  }

  // Detect hook usage
  if (code.includes('useState') || code.includes('useEffect')) {
    patterns.push({
      type: 'hook',
      confidence: 0.95,
      location: { startLine: 1, endLine: lines.length },
      details: {
        useState: code.includes('useState'),
        useEffect: code.includes('useEffect'),
      },
    });
  }

  return patterns;
}

/**
 * Detect accessibility issues using heuristics
 */
export function detectAccessibilityIssues(code: string): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];

  // Check for images without alt
  if (code.includes('<img') && !code.includes('alt=')) {
    issues.push({
      type: 'missing-alt',
      severity: 'error',
      element: 'img',
      message: 'Image is missing alt attribute',
      suggestion: 'Add alt="" for decorative images or descriptive alt text for meaningful images',
    });
  }

  // Check for buttons without accessible text
  const buttonMatch = code.match(/<button[^>]*>[\s]*<[^/]/);
  if (buttonMatch && !code.includes('aria-label')) {
    issues.push({
      type: 'missing-label',
      severity: 'warning',
      element: 'button',
      message: 'Button may be missing accessible text',
      suggestion: 'Ensure buttons have visible text or aria-label for screen readers',
    });
  }

  // Check for form inputs without labels
  if (code.includes('<input') && !code.includes('<label') && !code.includes('aria-label')) {
    issues.push({
      type: 'missing-label',
      severity: 'error',
      element: 'input',
      message: 'Form input is missing associated label',
      suggestion: 'Add a <label> element or aria-label attribute',
    });
  }

  // Check for interactive elements without role
  if (code.includes('onClick') && code.includes('<div') && !code.includes('role=')) {
    issues.push({
      type: 'missing-role',
      severity: 'warning',
      element: 'div',
      message: 'Clickable div missing role attribute',
      suggestion: 'Add role="button" and tabIndex="0" for keyboard accessibility',
    });
  }

  return issues;
}

/**
 * Detect responsive design issues
 */
export function detectResponsiveIssues(code: string): ResponsiveIssue[] {
  const issues: ResponsiveIssue[] = [];

  // Check for fixed pixel widths
  const fixedWidthMatch = code.match(/w-\[\d+px\]/);
  if (fixedWidthMatch) {
    issues.push({
      type: 'fixed-width',
      element: 'element with fixed width',
      message: `Found fixed pixel width: ${fixedWidthMatch[0]}`,
      suggestion: 'Consider using relative units or responsive classes (w-full, max-w-md, etc.)',
    });
  }

  // Check for missing responsive breakpoints
  if (!code.includes('sm:') && !code.includes('md:') && !code.includes('lg:')) {
    issues.push({
      type: 'missing-breakpoint',
      element: 'component',
      message: 'No responsive breakpoints found',
      suggestion: 'Add Tailwind responsive prefixes (sm:, md:, lg:) for different screen sizes',
    });
  }

  // Check for small touch targets
  if (code.includes('w-4') || code.includes('h-4') || code.includes('p-1')) {
    issues.push({
      type: 'touch-target',
      element: 'interactive element',
      message: 'Potentially small touch target detected',
      suggestion: 'Ensure touch targets are at least 44x44px for mobile accessibility',
    });
  }

  return issues;
}

/**
 * Run comprehensive AI-powered analysis
 */
export async function analyzeCodeWithAI(
  code: string,
  config: DesignerAIConfig
): Promise<{ success: boolean; analysis?: CodeAnalysisResult; error?: string }> {
  if (!config.apiKey && config.provider !== 'ollama') {
    return {
      success: false,
      error: `No API key configured for ${config.provider}`,
    };
  }

  try {
    const model = getProviderModel(
      config.provider,
      config.model,
      config.apiKey || '',
      config.baseURL
    );

    const result = await generateObject({
      model,
      schema: analysisResultSchema,
      system: ANALYSIS_SYSTEM_PROMPT,
      prompt: `Analyze this React component:\n\n${code}`,
      temperature: 0.4,
    });

    const analysis: CodeAnalysisResult = {
      patterns: result.object.patterns as CodePattern[],
      accessibility: result.object.accessibility as AccessibilityIssue[],
      responsive: result.object.responsive as ResponsiveIssue[],
      suggestions: result.object.suggestions.map((s, i) => ({
        id: `suggestion-${i}`,
        ...s,
      })) as AISuggestion[],
      summary: result.object.summary,
    };

    return { success: true, analysis };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed',
    };
  }
}

/**
 * Run quick local analysis without AI
 */
export function analyzeCodeLocal(code: string): CodeAnalysisResult {
  const patterns = detectPatternsSimple(code);
  const accessibility = detectAccessibilityIssues(code);
  const responsive = detectResponsiveIssues(code);

  const suggestions: AISuggestion[] = [];

  // Convert accessibility issues to suggestions
  accessibility.forEach((issue, i) => {
    suggestions.push({
      id: `a11y-${i}`,
      type: 'accessibility',
      title: issue.message,
      description: issue.suggestion,
      priority: issue.severity === 'error' ? 'high' : 'medium',
    });
  });

  // Convert responsive issues to suggestions
  responsive.forEach((issue, i) => {
    suggestions.push({
      id: `responsive-${i}`,
      type: 'responsive',
      title: issue.message,
      description: issue.suggestion,
      priority: 'medium',
    });
  });

  const summary = `Found ${patterns.length} patterns, ${accessibility.length} accessibility issues, and ${responsive.length} responsive design issues.`;

  return {
    patterns,
    accessibility,
    responsive,
    suggestions,
    summary,
  };
}

const aiAnalyzerAPI = {
  detectPatternsSimple,
  detectAccessibilityIssues,
  detectResponsiveIssues,
  analyzeCodeWithAI,
  analyzeCodeLocal,
};

export default aiAnalyzerAPI;
