'use client';

/**
 * Tour Configurations for Different Pages
 * Defines guided tour steps for various application pages
 */

import React from 'react';
import {
  MessageSquare,
  Sparkles,
  FolderOpen,
  Send,
  Settings,
  Palette,
  Bot,
  Search,
  Database,
  BookOpen,
  GraduationCap,
  FileCode,
  Layers,
  Layout,
  Puzzle,
  FolderPlus,
  GitBranch,
  Play,
} from 'lucide-react';
import type { TourStep } from './onboarding-tour';

/**
 * Main Chat Page Tour
 */
export const chatTourSteps: TourStep[] = [
  {
    id: 'chat-welcome',
    titleKey: 'welcomeTitle',
    descriptionKey: 'welcomeDesc',
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    id: 'chat-modes',
    titleKey: 'modesTitle',
    descriptionKey: 'modesDesc',
    targetSelector: '[data-tour="mode-selector"]',
    position: 'bottom',
    highlight: true,
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    id: 'chat-sidebar',
    titleKey: 'sidebarTitle',
    descriptionKey: 'sidebarDesc',
    targetSelector: '[data-tour="sidebar"]',
    position: 'right',
    highlight: true,
    icon: <FolderOpen className="h-5 w-5" />,
  },
  {
    id: 'chat-input',
    titleKey: 'inputTitle',
    descriptionKey: 'inputDesc',
    targetSelector: '[data-tour="chat-input"]',
    position: 'top',
    highlight: true,
    icon: <Send className="h-5 w-5" />,
  },
  {
    id: 'chat-complete',
    titleKey: 'completeTitle',
    descriptionKey: 'completeDesc',
    icon: <Settings className="h-5 w-5" />,
  },
];

/**
 * Settings Page Tour
 */
export const settingsTourSteps: TourStep[] = [
  {
    id: 'settings-welcome',
    titleKey: 'settingsWelcome',
    descriptionKey: 'settingsWelcomeDesc',
    icon: <Settings className="h-5 w-5" />,
  },
  {
    id: 'settings-providers',
    titleKey: 'settingsProviders',
    descriptionKey: 'settingsProvidersDesc',
    targetSelector: '[data-tour="settings-providers"]',
    position: 'bottom',
    highlight: true,
    icon: <Bot className="h-5 w-5" />,
  },
  {
    id: 'settings-appearance',
    titleKey: 'settingsAppearance',
    descriptionKey: 'settingsAppearanceDesc',
    targetSelector: '[data-tour="settings-appearance"]',
    position: 'bottom',
    highlight: true,
    icon: <Palette className="h-5 w-5" />,
  },
  {
    id: 'settings-mcp',
    titleKey: 'settingsMcp',
    descriptionKey: 'settingsMcpDesc',
    targetSelector: '[data-tour="settings-mcp"]',
    position: 'bottom',
    highlight: true,
    icon: <Puzzle className="h-5 w-5" />,
  },
  {
    id: 'settings-search',
    titleKey: 'settingsSearch',
    descriptionKey: 'settingsSearchDesc',
    targetSelector: '[data-tour="settings-search"]',
    position: 'bottom',
    highlight: true,
    icon: <Search className="h-5 w-5" />,
  },
  {
    id: 'settings-data',
    titleKey: 'settingsData',
    descriptionKey: 'settingsDataDesc',
    targetSelector: '[data-tour="settings-data"]',
    position: 'bottom',
    highlight: true,
    icon: <Database className="h-5 w-5" />,
  },
];

/**
 * Projects Page Tour
 */
export const projectsTourSteps: TourStep[] = [
  {
    id: 'projects-welcome',
    titleKey: 'projectsWelcome',
    descriptionKey: 'projectsWelcomeDesc',
    icon: <FolderOpen className="h-5 w-5" />,
  },
  {
    id: 'projects-create',
    titleKey: 'projectsCreate',
    descriptionKey: 'projectsCreateDesc',
    targetSelector: '[data-tour="projects-create"]',
    position: 'bottom',
    highlight: true,
    icon: <FolderPlus className="h-5 w-5" />,
  },
  {
    id: 'projects-knowledge',
    titleKey: 'projectsKnowledge',
    descriptionKey: 'projectsKnowledgeDesc',
    targetSelector: '[data-tour="projects-knowledge"]',
    position: 'right',
    highlight: true,
    icon: <FileCode className="h-5 w-5" />,
  },
  {
    id: 'projects-context',
    titleKey: 'projectsContext',
    descriptionKey: 'projectsContextDesc',
    targetSelector: '[data-tour="projects-context"]',
    position: 'right',
    highlight: true,
    icon: <Layers className="h-5 w-5" />,
  },
];

/**
 * Designer Page Tour
 */
export const designerTourSteps: TourStep[] = [
  {
    id: 'designer-welcome',
    titleKey: 'designerWelcome',
    descriptionKey: 'designerWelcomeDesc',
    icon: <Layout className="h-5 w-5" />,
  },
  {
    id: 'designer-templates',
    titleKey: 'designerTemplates',
    descriptionKey: 'designerTemplatesDesc',
    targetSelector: '[data-tour="designer-templates"]',
    position: 'bottom',
    highlight: true,
    icon: <Layers className="h-5 w-5" />,
  },
  {
    id: 'designer-canvas',
    titleKey: 'designerCanvas',
    descriptionKey: 'designerCanvasDesc',
    targetSelector: '[data-tour="designer-canvas"]',
    position: 'left',
    highlight: true,
    icon: <Layout className="h-5 w-5" />,
  },
  {
    id: 'designer-preview',
    titleKey: 'designerPreview',
    descriptionKey: 'designerPreviewDesc',
    targetSelector: '[data-tour="designer-preview"]',
    position: 'bottom',
    highlight: true,
    icon: <Play className="h-5 w-5" />,
  },
];

/**
 * Academic Page Tour
 */
export const academicTourSteps: TourStep[] = [
  {
    id: 'academic-welcome',
    titleKey: 'academicWelcome',
    descriptionKey: 'academicWelcomeDesc',
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    id: 'academic-research',
    titleKey: 'academicResearch',
    descriptionKey: 'academicResearchDesc',
    targetSelector: '[data-tour="academic-research"]',
    position: 'right',
    highlight: true,
    icon: <Search className="h-5 w-5" />,
  },
  {
    id: 'academic-knowledge',
    titleKey: 'academicKnowledge',
    descriptionKey: 'academicKnowledgeDesc',
    targetSelector: '[data-tour="academic-knowledge"]',
    position: 'bottom',
    highlight: true,
    icon: <GitBranch className="h-5 w-5" />,
  },
  {
    id: 'academic-writing',
    titleKey: 'academicWriting',
    descriptionKey: 'academicWritingDesc',
    targetSelector: '[data-tour="academic-writing"]',
    position: 'left',
    highlight: true,
    icon: <BookOpen className="h-5 w-5" />,
  },
];

/**
 * Tour configuration registry
 */
export const tourConfigs = {
  'feature-tour': chatTourSteps,
  'settings-tour': settingsTourSteps,
  'projects-tour': projectsTourSteps,
  'designer-tour': designerTourSteps,
  'academic-tour': academicTourSteps,
} as const;

export type TourId = keyof typeof tourConfigs;

/**
 * Get tour steps by tour ID
 */
export function getTourSteps(tourId: TourId): TourStep[] {
  return tourConfigs[tourId] || [];
}

/**
 * Check if a tour should be shown for a given path
 */
export function getTourIdForPath(pathname: string): TourId | null {
  if (pathname === '/' || pathname.startsWith('/chat')) {
    return 'feature-tour';
  }
  if (pathname.startsWith('/settings')) {
    return 'settings-tour';
  }
  if (pathname.startsWith('/projects')) {
    return 'projects-tour';
  }
  if (pathname.startsWith('/designer')) {
    return 'designer-tour';
  }
  if (pathname.startsWith('/academic')) {
    return 'academic-tour';
  }
  return null;
}
