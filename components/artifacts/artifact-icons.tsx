/**
 * Artifact Icons - Centralized icon components for artifact types
 * Eliminates duplicate icon definitions across components
 */

import {
  Code,
  FileText,
  Image as ImageIcon,
  BarChart,
  GitBranch,
  Sparkles,
  Calculator,
  BookOpen,
} from 'lucide-react';
import type { ArtifactType } from '@/types';

/**
 * Get the icon component for an artifact type
 */
export function getArtifactTypeIcon(type: ArtifactType, className = 'h-4 w-4') {
  const icons: Record<ArtifactType, React.ReactNode> = {
    code: <Code className={className} />,
    document: <FileText className={className} />,
    svg: <ImageIcon className={className} />,
    html: <Code className={className} />,
    react: <Sparkles className={className} />,
    mermaid: <GitBranch className={className} />,
    chart: <BarChart className={className} />,
    math: <Calculator className={className} />,
    jupyter: <BookOpen className={className} />,
  };

  return icons[type] || <Code className={className} />;
}

/**
 * Artifact type icon mapping (for components that need direct access)
 */
export const ARTIFACT_TYPE_ICONS: Record<ArtifactType, React.ReactNode> = {
  code: <Code className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  svg: <ImageIcon className="h-4 w-4" />,
  html: <Code className="h-4 w-4" />,
  react: <Sparkles className="h-4 w-4" />,
  mermaid: <GitBranch className="h-4 w-4" />,
  chart: <BarChart className="h-4 w-4" />,
  math: <Calculator className="h-4 w-4" />,
  jupyter: <BookOpen className="h-4 w-4" />,
};
