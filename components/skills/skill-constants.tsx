'use client';

/**
 * Shared skill category constants
 *
 * Centralizes category icons, colors, and label keys used across skill components.
 */

import {
  Code,
  Palette,
  Building2,
  Zap,
  BarChart3,
  MessageSquare,
  Cog,
  FileText,
} from 'lucide-react';
import type { SkillCategory } from '@/types/system/skill';

/**
 * Category icons at default size (h-4 w-4)
 */
export const CATEGORY_ICONS: Record<SkillCategory, React.ReactNode> = {
  'creative-design': <Palette className="h-4 w-4" />,
  'development': <Code className="h-4 w-4" />,
  'enterprise': <Building2 className="h-4 w-4" />,
  'productivity': <Zap className="h-4 w-4" />,
  'data-analysis': <BarChart3 className="h-4 w-4" />,
  'communication': <MessageSquare className="h-4 w-4" />,
  'meta': <Cog className="h-4 w-4" />,
  'custom': <FileText className="h-4 w-4" />,
};

/**
 * Category icons at small size (h-3.5 w-3.5)
 */
export const CATEGORY_ICONS_SM: Record<SkillCategory, React.ReactNode> = {
  'creative-design': <Palette className="h-3.5 w-3.5" />,
  'development': <Code className="h-3.5 w-3.5" />,
  'enterprise': <Building2 className="h-3.5 w-3.5" />,
  'productivity': <Zap className="h-3.5 w-3.5" />,
  'data-analysis': <BarChart3 className="h-3.5 w-3.5" />,
  'communication': <MessageSquare className="h-3.5 w-3.5" />,
  'meta': <Cog className="h-3.5 w-3.5" />,
  'custom': <FileText className="h-3.5 w-3.5" />,
};

/**
 * Category icons at large size (h-5 w-5)
 */
export const CATEGORY_ICONS_LG: Record<SkillCategory, React.ReactNode> = {
  'creative-design': <Palette className="h-5 w-5" />,
  'development': <Code className="h-5 w-5" />,
  'enterprise': <Building2 className="h-5 w-5" />,
  'productivity': <Zap className="h-5 w-5" />,
  'data-analysis': <BarChart3 className="h-5 w-5" />,
  'communication': <MessageSquare className="h-5 w-5" />,
  'meta': <Cog className="h-5 w-5" />,
  'custom': <FileText className="h-5 w-5" />,
};

/**
 * Category background/text color classes for badges and icons
 */
export const CATEGORY_COLORS: Record<SkillCategory, string> = {
  'creative-design': 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  'development': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'enterprise': 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  'productivity': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  'data-analysis': 'bg-green-500/10 text-green-600 dark:text-green-400',
  'communication': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  'meta': 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  'custom': 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

/**
 * i18n label keys for category names
 */
export const CATEGORY_LABEL_KEYS: Record<SkillCategory, string> = {
  'creative-design': 'categoryCreativeDesign',
  'development': 'categoryDevelopment',
  'enterprise': 'categoryEnterprise',
  'productivity': 'categoryProductivity',
  'data-analysis': 'categoryDataAnalysis',
  'communication': 'categoryCommunication',
  'meta': 'categoryMeta',
  'custom': 'categoryCustom',
};

/**
 * i18n description keys for category descriptions
 */
export const CATEGORY_DESC_KEYS: Record<SkillCategory, string> = {
  'creative-design': 'categoryCreativeDesignDesc',
  'development': 'categoryDevelopmentDesc',
  'enterprise': 'categoryEnterpriseDesc',
  'productivity': 'categoryProductivityDesc',
  'data-analysis': 'categoryDataAnalysisDesc',
  'communication': 'categoryCommunicationDesc',
  'meta': 'categoryMetaDesc',
  'custom': 'categoryCustomDesc',
};

/**
 * Combined category options for select/wizard UIs
 */
export const CATEGORY_OPTIONS: Array<{
  value: SkillCategory;
  labelKey: string;
  descKey: string;
  icon: React.ReactNode;
}> = [
  { value: 'creative-design', labelKey: 'categoryCreativeDesign', icon: <Palette className="h-5 w-5" />, descKey: 'categoryCreativeDesignDesc' },
  { value: 'development', labelKey: 'categoryDevelopment', icon: <Code className="h-5 w-5" />, descKey: 'categoryDevelopmentDesc' },
  { value: 'enterprise', labelKey: 'categoryEnterprise', icon: <Building2 className="h-5 w-5" />, descKey: 'categoryEnterpriseDesc' },
  { value: 'productivity', labelKey: 'categoryProductivity', icon: <Zap className="h-5 w-5" />, descKey: 'categoryProductivityDesc' },
  { value: 'data-analysis', labelKey: 'categoryDataAnalysis', icon: <BarChart3 className="h-5 w-5" />, descKey: 'categoryDataAnalysisDesc' },
  { value: 'communication', labelKey: 'categoryCommunication', icon: <MessageSquare className="h-5 w-5" />, descKey: 'categoryCommunicationDesc' },
  { value: 'meta', labelKey: 'categoryMeta', icon: <Cog className="h-5 w-5" />, descKey: 'categoryMetaDesc' },
  { value: 'custom', labelKey: 'categoryCustom', icon: <FileText className="h-5 w-5" />, descKey: 'categoryCustomDesc' },
];
