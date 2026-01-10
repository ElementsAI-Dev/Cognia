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
    title: 'Welcome to Cognia',
    description: 'Your AI-powered assistant for chat, code, research, and learning. Let me show you around!',
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    id: 'chat-modes',
    titleKey: 'modesTitle',
    descriptionKey: 'modesDesc',
    title: 'Multiple Modes',
    description: 'Switch between Chat, Agent, Research, and Learning modes depending on your task.',
    targetSelector: '[data-tour="mode-selector"]',
    position: 'bottom',
    highlight: true,
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    id: 'chat-sidebar',
    titleKey: 'sidebarTitle',
    descriptionKey: 'sidebarDesc',
    title: 'Session Management',
    description: 'All your conversations are saved here. Search, organize, and pin your favorites.',
    targetSelector: '[data-tour="sidebar"]',
    position: 'right',
    highlight: true,
    icon: <FolderOpen className="h-5 w-5" />,
  },
  {
    id: 'chat-input',
    titleKey: 'inputTitle',
    descriptionKey: 'inputDesc',
    title: 'Start Chatting',
    description: 'Type your message, attach files, use voice input, or mention @tools for special actions.',
    targetSelector: '[data-tour="chat-input"]',
    position: 'top',
    highlight: true,
    icon: <Send className="h-5 w-5" />,
  },
  {
    id: 'chat-complete',
    titleKey: 'completeTitle',
    descriptionKey: 'completeDesc',
    title: 'You\'re All Set!',
    description: 'Explore the settings for more customization options. Happy chatting!',
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
    title: 'Settings Overview',
    description: 'Customize Cognia to match your preferences and workflow.',
    icon: <Settings className="h-5 w-5" />,
  },
  {
    id: 'settings-providers',
    titleKey: 'settingsProviders',
    descriptionKey: 'settingsProvidersDesc',
    title: 'AI Providers',
    description: 'Configure your AI providers and API keys. Add OpenAI, Anthropic, Google, and more.',
    targetSelector: '[data-tour="settings-providers"]',
    position: 'bottom',
    highlight: true,
    icon: <Bot className="h-5 w-5" />,
  },
  {
    id: 'settings-appearance',
    titleKey: 'settingsAppearance',
    descriptionKey: 'settingsAppearanceDesc',
    title: 'Appearance',
    description: 'Customize the look and feel with themes, colors, and background settings.',
    targetSelector: '[data-tour="settings-appearance"]',
    position: 'bottom',
    highlight: true,
    icon: <Palette className="h-5 w-5" />,
  },
  {
    id: 'settings-mcp',
    titleKey: 'settingsMcp',
    descriptionKey: 'settingsMcpDesc',
    title: 'MCP Servers',
    description: 'Extend AI capabilities with Model Context Protocol servers for tools and integrations.',
    targetSelector: '[data-tour="settings-mcp"]',
    position: 'bottom',
    highlight: true,
    icon: <Puzzle className="h-5 w-5" />,
  },
  {
    id: 'settings-search',
    titleKey: 'settingsSearch',
    descriptionKey: 'settingsSearchDesc',
    title: 'Web Search',
    description: 'Configure search providers to enable AI web search and research capabilities.',
    targetSelector: '[data-tour="settings-search"]',
    position: 'bottom',
    highlight: true,
    icon: <Search className="h-5 w-5" />,
  },
  {
    id: 'settings-data',
    titleKey: 'settingsData',
    descriptionKey: 'settingsDataDesc',
    title: 'Data Management',
    description: 'Export, import, and manage your chat history and settings.',
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
    title: 'Projects Overview',
    description: 'Organize your work into projects with custom contexts and knowledge bases.',
    icon: <FolderOpen className="h-5 w-5" />,
  },
  {
    id: 'projects-create',
    titleKey: 'projectsCreate',
    descriptionKey: 'projectsCreateDesc',
    title: 'Create Projects',
    description: 'Create new projects to organize your conversations and documents by topic or task.',
    targetSelector: '[data-tour="projects-create"]',
    position: 'bottom',
    highlight: true,
    icon: <FolderPlus className="h-5 w-5" />,
  },
  {
    id: 'projects-knowledge',
    titleKey: 'projectsKnowledge',
    descriptionKey: 'projectsKnowledgeDesc',
    title: 'Knowledge Base',
    description: 'Add documents, code, and files to build a project-specific knowledge base for AI context.',
    targetSelector: '[data-tour="projects-knowledge"]',
    position: 'right',
    highlight: true,
    icon: <FileCode className="h-5 w-5" />,
  },
  {
    id: 'projects-context',
    titleKey: 'projectsContext',
    descriptionKey: 'projectsContextDesc',
    title: 'Project Context',
    description: 'Set custom instructions and context that apply to all conversations in this project.',
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
    title: 'AI App Designer',
    description: 'Build interactive AI-powered applications with a visual designer.',
    icon: <Layout className="h-5 w-5" />,
  },
  {
    id: 'designer-templates',
    titleKey: 'designerTemplates',
    descriptionKey: 'designerTemplatesDesc',
    title: 'Templates',
    description: 'Start with pre-built templates for common use cases like chatbots, forms, and dashboards.',
    targetSelector: '[data-tour="designer-templates"]',
    position: 'bottom',
    highlight: true,
    icon: <Layers className="h-5 w-5" />,
  },
  {
    id: 'designer-canvas',
    titleKey: 'designerCanvas',
    descriptionKey: 'designerCanvasDesc',
    title: 'Design Canvas',
    description: 'Drag and drop components to build your application interface.',
    targetSelector: '[data-tour="designer-canvas"]',
    position: 'left',
    highlight: true,
    icon: <Layout className="h-5 w-5" />,
  },
  {
    id: 'designer-preview',
    titleKey: 'designerPreview',
    descriptionKey: 'designerPreviewDesc',
    title: 'Preview & Deploy',
    description: 'Preview your app in real-time and deploy it when ready.',
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
    title: 'Academic Mode',
    description: 'A specialized environment for research, learning, and academic writing.',
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    id: 'academic-research',
    titleKey: 'academicResearch',
    descriptionKey: 'academicResearchDesc',
    title: 'Research Tools',
    description: 'Search academic papers, analyze sources, and generate citations automatically.',
    targetSelector: '[data-tour="academic-research"]',
    position: 'right',
    highlight: true,
    icon: <Search className="h-5 w-5" />,
  },
  {
    id: 'academic-knowledge',
    titleKey: 'academicKnowledge',
    descriptionKey: 'academicKnowledgeDesc',
    title: 'Knowledge Map',
    description: 'Visualize connections between concepts and build a structured knowledge base.',
    targetSelector: '[data-tour="academic-knowledge"]',
    position: 'bottom',
    highlight: true,
    icon: <GitBranch className="h-5 w-5" />,
  },
  {
    id: 'academic-writing',
    titleKey: 'academicWriting',
    descriptionKey: 'academicWritingDesc',
    title: 'Writing Assistant',
    description: 'Get help with academic writing, including outlines, drafts, and citations.',
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
