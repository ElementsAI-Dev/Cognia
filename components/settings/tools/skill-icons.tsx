'use client';

/**
 * Skill Category Icons
 *
 * Icon mappings for skill categories.
 * Separated from constants due to React JSX dependency.
 */

import {
  Palette,
  Code,
  Building2,
  Zap,
  BarChart3,
  MessageSquare,
  Cog,
  FileText,
} from 'lucide-react';
import type { SkillCategory } from '@/types/system/skill';
import type { ReactNode } from 'react';

/**
 * Icon components for each skill category
 */
export const SKILL_CATEGORY_ICONS: Record<SkillCategory, ReactNode> = {
  'creative-design': <Palette className="h-4 w-4" />,
  development: <Code className="h-4 w-4" />,
  enterprise: <Building2 className="h-4 w-4" />,
  productivity: <Zap className="h-4 w-4" />,
  'data-analysis': <BarChart3 className="h-4 w-4" />,
  communication: <MessageSquare className="h-4 w-4" />,
  meta: <Cog className="h-4 w-4" />,
  custom: <FileText className="h-4 w-4" />,
};
