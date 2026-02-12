/**
 * Constants for the custom syntax theme editor
 */

import type { ColorFieldConfig } from '@/types/export/custom-theme';
import type { SyntaxTheme } from '@/lib/export/html/syntax-themes';

export const COLOR_FIELDS: readonly ColorFieldConfig[] = [
  { key: 'background', labelKey: 'colorBackground', descKey: 'colorBackgroundDesc' },
  { key: 'foreground', labelKey: 'colorForeground', descKey: 'colorForegroundDesc' },
  { key: 'comment', labelKey: 'colorComment', descKey: 'colorCommentDesc' },
  { key: 'keyword', labelKey: 'colorKeyword', descKey: 'colorKeywordDesc' },
  { key: 'string', labelKey: 'colorString', descKey: 'colorStringDesc' },
  { key: 'number', labelKey: 'colorNumber', descKey: 'colorNumberDesc' },
  { key: 'function', labelKey: 'colorFunction', descKey: 'colorFunctionDesc' },
  { key: 'operator', labelKey: 'colorOperator', descKey: 'colorOperatorDesc' },
  { key: 'property', labelKey: 'colorProperty', descKey: 'colorPropertyDesc' },
  { key: 'className', labelKey: 'colorClass', descKey: 'colorClassDesc' },
  { key: 'constant', labelKey: 'colorConstant', descKey: 'colorConstantDesc' },
  { key: 'tag', labelKey: 'colorTag', descKey: 'colorTagDesc' },
  { key: 'attrName', labelKey: 'colorAttrName', descKey: 'colorAttrNameDesc' },
  { key: 'attrValue', labelKey: 'colorAttrValue', descKey: 'colorAttrValueDesc' },
  { key: 'punctuation', labelKey: 'colorPunctuation', descKey: 'colorPunctuationDesc' },
  { key: 'selection', labelKey: 'colorSelection', descKey: 'colorSelectionDesc' },
  { key: 'lineHighlight', labelKey: 'colorLineHighlight', descKey: 'colorLineHighlightDesc' },
] as const;

export const SAMPLE_CODE = `// Sample code preview
function greetUser(name) {
  const message = "Hello, " + name;
  console.log(message);
  return { greeting: message, count: 42 };
}

// Call the function
const result = greetUser("World");`;

/**
 * Generate CSS preview styles for a set of syntax theme colors
 */
export function generatePreviewStyles(colors: SyntaxTheme['colors']): string {
  return `
    .preview-code {
      background: ${colors.background};
      color: ${colors.foreground};
      padding: 16px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      line-height: 1.6;
      overflow-x: auto;
    }
    .preview-code .comment { color: ${colors.comment}; font-style: italic; }
    .preview-code .keyword { color: ${colors.keyword}; font-weight: 500; }
    .preview-code .string { color: ${colors.string}; }
    .preview-code .number { color: ${colors.number}; }
    .preview-code .function { color: ${colors.function}; }
    .preview-code .operator { color: ${colors.operator}; }
    .preview-code .property { color: ${colors.property}; }
    .preview-code .punctuation { color: ${colors.punctuation}; }
  `;
}

/**
 * Apply simple syntax highlighting to code string
 */
export function generateHighlightedCode(code: string): string {
  return code
    .replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
    .replace(/\b(function|const|return)\b/g, '<span class="keyword">$1</span>')
    .replace(/"([^"]*)"/g, '<span class="string">"$1"</span>')
    .replace(/\b(\d+)\b/g, '<span class="number">$1</span>')
    .replace(/\b(\w+)\s*\(/g, '<span class="function">$1</span>(')
    .replace(/([+:{}(),;])/g, '<span class="punctuation">$1</span>');
}
