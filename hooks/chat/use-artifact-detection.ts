/**
 * useArtifactDetection - Hook to detect and extract artifacts from AI responses
 */

import { useMemo } from 'react';
import type { ArtifactType, ArtifactLanguage } from '@/types';

export interface DetectedArtifact {
  type: ArtifactType;
  language?: ArtifactLanguage;
  content: string;
  title: string;
  startIndex: number;
  endIndex: number;
}

interface UseArtifactDetectionOptions {
  enabled?: boolean;
  minCodeLength?: number;
}

// Language patterns for code block detection
const LANGUAGE_PATTERNS: Record<string, { type: ArtifactType; language?: ArtifactLanguage }> = {
  // React/JSX
  jsx: { type: 'react', language: 'jsx' },
  tsx: { type: 'react', language: 'tsx' },

  // Web
  html: { type: 'html', language: 'html' },
  svg: { type: 'svg', language: 'svg' },
  css: { type: 'code', language: 'css' },

  // JavaScript/TypeScript
  javascript: { type: 'code', language: 'javascript' },
  js: { type: 'code', language: 'javascript' },
  typescript: { type: 'code', language: 'typescript' },
  ts: { type: 'code', language: 'typescript' },

  // Other languages
  python: { type: 'code', language: 'python' },
  py: { type: 'code', language: 'python' },
  sql: { type: 'code', language: 'sql' },
  bash: { type: 'code', language: 'bash' },
  sh: { type: 'code', language: 'bash' },
  shell: { type: 'code', language: 'bash' },

  // Data formats
  json: { type: 'code', language: 'json' },
  yaml: { type: 'code', language: 'yaml' },
  yml: { type: 'code', language: 'yaml' },
  xml: { type: 'code', language: 'xml' },

  // Special types
  mermaid: { type: 'mermaid', language: 'mermaid' },
  latex: { type: 'math', language: 'latex' },
  tex: { type: 'math', language: 'latex' },
  math: { type: 'math', language: 'latex' },
  markdown: { type: 'document', language: 'markdown' },
  md: { type: 'document', language: 'markdown' },
};

// Regex pattern to match fenced code blocks
const CODE_BLOCK_PATTERN = /```(\w*)\n([\s\S]*?)```/g;

// Detect if content looks like a React component
function looksLikeReactComponent(content: string): boolean {
  return (
    (content.includes('export default') || content.includes('export function')) &&
    (content.includes('return (') || content.includes('return(')) &&
    content.includes('<') &&
    content.includes('/>')
  );
}

// Detect if content looks like chart data
function looksLikeChartData(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];
      return (
        typeof first === 'object' &&
        ('name' in first || 'label' in first) &&
        ('value' in first || 'count' in first)
      );
    }
    if (parsed.data && Array.isArray(parsed.data)) {
      return true;
    }
    if (parsed.type && ['line', 'bar', 'pie', 'area', 'scatter', 'radar'].includes(parsed.type)) {
      return true;
    }
  } catch {
    // Not valid JSON
  }
  return false;
}

// Generate a title from code content
function generateTitle(content: string, language?: string, type?: ArtifactType): string {
  // Try to extract function/component name
  const functionMatch = content.match(
    /(?:export\s+)?(?:default\s+)?(?:function|const|class)\s+(\w+)/
  );
  if (functionMatch) {
    return functionMatch[1];
  }

  // For mermaid, try to extract diagram type
  if (type === 'mermaid') {
    const mermaidMatch = content.match(
      /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap)/m
    );
    if (mermaidMatch) {
      const typeNames: Record<string, string> = {
        graph: 'Flowchart',
        flowchart: 'Flowchart',
        sequenceDiagram: 'Sequence Diagram',
        classDiagram: 'Class Diagram',
        stateDiagram: 'State Diagram',
        erDiagram: 'ER Diagram',
        gantt: 'Gantt Chart',
        pie: 'Pie Chart',
        mindmap: 'Mind Map',
      };
      return typeNames[mermaidMatch[1]] || 'Mermaid Diagram';
    }
    return 'Mermaid Diagram';
  }

  // For math, use a generic title
  if (type === 'math') {
    return 'Math Expression';
  }

  // For charts
  if (type === 'chart') {
    return 'Data Chart';
  }

  // Use language as fallback
  if (language) {
    const langNames: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      html: 'HTML',
      css: 'CSS',
      jsx: 'React Component',
      tsx: 'React Component',
      sql: 'SQL Query',
      bash: 'Shell Script',
    };
    return langNames[language] || `${language.charAt(0).toUpperCase() + language.slice(1)} Code`;
  }

  return 'Code Snippet';
}

/**
 * Hook to detect artifacts in text content
 */
export function useArtifactDetection(
  content: string,
  options: UseArtifactDetectionOptions = {}
): DetectedArtifact[] {
  const { enabled = true, minCodeLength = 50 } = options;

  const artifacts = useMemo(() => {
    if (!enabled || !content) return [];

    const detected: DetectedArtifact[] = [];

    // Create a new regex instance to avoid state issues
    const codeBlockRegex = new RegExp(CODE_BLOCK_PATTERN.source, 'g');
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const [fullMatch, lang, codeContent] = match;
      const trimmedContent = codeContent.trim();

      // Skip short code blocks
      if (trimmedContent.length < minCodeLength) continue;

      const langLower = lang?.toLowerCase() || '';
      let typeInfo = LANGUAGE_PATTERNS[langLower] || { type: 'code' as ArtifactType };

      // Special detection for JSON that might be chart data
      if (langLower === 'json' && looksLikeChartData(trimmedContent)) {
        typeInfo = { type: 'chart', language: 'json' };
      }

      // Special detection for JS/TS that might be React components
      if (
        (langLower === 'javascript' ||
          langLower === 'typescript' ||
          langLower === 'js' ||
          langLower === 'ts') &&
        looksLikeReactComponent(trimmedContent)
      ) {
        typeInfo = {
          type: 'react',
          language: langLower.startsWith('t') ? 'tsx' : 'jsx',
        };
      }

      const title = generateTitle(trimmedContent, typeInfo.language, typeInfo.type);

      detected.push({
        type: typeInfo.type,
        language: typeInfo.language,
        content: trimmedContent,
        title,
        startIndex: match.index,
        endIndex: match.index + fullMatch.length,
      });
    }

    return detected;
  }, [content, enabled, minCodeLength]);

  return artifacts;
}

/**
 * Utility function to detect artifact type from language string
 */
export function detectArtifactType(language?: string, content?: string): ArtifactType {
  if (!language) return 'code';

  const langLower = language.toLowerCase();
  const typeInfo = LANGUAGE_PATTERNS[langLower];

  if (typeInfo) {
    // Special case for JSON that might be chart data
    if (langLower === 'json' && content && looksLikeChartData(content)) {
      return 'chart';
    }
    return typeInfo.type;
  }

  return 'code';
}

/**
 * Utility function to map language to ArtifactLanguage
 */
export function mapToArtifactLanguage(language?: string): ArtifactLanguage | undefined {
  if (!language) return undefined;

  const langLower = language.toLowerCase();
  const typeInfo = LANGUAGE_PATTERNS[langLower];

  return typeInfo?.language;
}

export default useArtifactDetection;
