/**
 * Artifact utility functions
 * Centralized logic shared across artifact components, hooks, and detectors
 */

import type { ArtifactType } from '@/types';
import { MERMAID_TYPE_NAMES, LANGUAGE_DISPLAY_NAMES } from './constants';

/**
 * Generate a title from artifact content
 * Merges best logic from all previous implementations:
 * - HTML <title> extraction (from artifact-detector)
 * - Mermaid diagram type detection (from use-artifact-detection)
 * - Function/component/export name extraction
 * - Language-based fallback naming
 */
export function generateArtifactTitle(
  content: string,
  type?: ArtifactType,
  language?: string
): string {
  // Try to extract HTML title
  const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) {
    return titleMatch[1];
  }

  // Try to extract export name (more specific, check first)
  const exportMatch = content.match(
    /export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/
  );
  if (exportMatch) {
    return exportMatch[1];
  }

  // Try to extract function/component/class name
  const functionMatch = content.match(/(?:function|const|class)\s+(\w+)/);
  if (functionMatch) {
    return functionMatch[1];
  }

  // For mermaid, try to extract diagram type
  if (type === 'mermaid') {
    const mermaidMatch = content.match(
      /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|gitGraph|journey)/m
    );
    if (mermaidMatch) {
      return MERMAID_TYPE_NAMES[mermaidMatch[1]] || 'Mermaid Diagram';
    }
    return 'Mermaid Diagram';
  }

  // Generate default title based on type
  if (type) {
    const typeNames: Record<ArtifactType, string> = {
      code: language
        ? `${LANGUAGE_DISPLAY_NAMES[language.toLowerCase()] || language.charAt(0).toUpperCase() + language.slice(1)} Code`
        : 'Code Snippet',
      document: 'Document',
      svg: 'SVG Graphic',
      html: 'HTML Page',
      react: 'React Component',
      mermaid: 'Mermaid Diagram',
      chart: 'Data Chart',
      math: 'Math Expression',
      jupyter: 'Jupyter Notebook',
    };
    return typeNames[type] || 'Untitled';
  }

  // Use language display name as fallback
  if (language) {
    return LANGUAGE_DISPLAY_NAMES[language.toLowerCase()] || `${language.charAt(0).toUpperCase() + language.slice(1)} Code`;
  }

  return 'Code Snippet';
}
