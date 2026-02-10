/**
 * Shared project utilities
 * Common helpers used across project components
 */

import {
  Folder,
  Code,
  BookOpen,
  Briefcase,
  GraduationCap,
  Heart,
  Home,
  Lightbulb,
  Music,
  Palette,
  PenTool,
  Rocket,
  Star,
  Target,
  Zap,
} from 'lucide-react';

/**
 * Map of icon names to their Lucide components
 */
const PROJECT_ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  Folder,
  Code,
  BookOpen,
  Briefcase,
  GraduationCap,
  Heart,
  Home,
  Lightbulb,
  Music,
  Palette,
  PenTool,
  Rocket,
  Star,
  Target,
  Zap,
};

/**
 * ProjectIcon - renders a project icon by name, defined outside render to avoid
 * React strict mode "component created during render" warnings.
 */
export function ProjectIcon({
  iconName,
  className,
  style,
}: {
  iconName?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = PROJECT_ICON_MAP[iconName || 'Folder'] || Folder;
  return <Icon className={className} style={style} />;
}

/**
 * Format a relative date string (e.g., "today", "yesterday", "3 days ago")
 */
export function formatRelativeDate(
  date: Date,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, any>) => string
): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return t('today');
  if (days === 1) return t('yesterday');
  if (days < 7) return t('daysAgo', { days });
  return new Date(date).toLocaleDateString();
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
