/**
 * Types for BeautifulExportDialog component
 */

import type { Session } from '@/types/core';
import type { PageLayoutSettings } from '@/components/document/page-layout-dialog';
import type { SyntaxThemeName } from '@/lib/export/html/syntax-themes';
import type { ThemeOption } from './common';

export type BeautifulExportFormat =
  | 'beautiful-html'
  | 'pdf'
  | 'markdown'
  | 'word'
  | 'excel'
  | 'csv'
  | 'animated-html'
  | 'json';

export interface BeautifulExportOptions {
  theme: ThemeOption;
  syntaxTheme: SyntaxThemeName;
  showTimestamps: boolean;
  showTokens: boolean;
  showThinkingProcess: boolean;
  showToolCalls: boolean;
  includeCoverPage: boolean;
  includeTableOfContents: boolean;
  syntaxHighlighting: boolean;
  compactMode: boolean;
  pageLayout: PageLayoutSettings;
}

export interface FormatConfigItem {
  icon: React.ElementType;
  label: string;
  description: string;
  extension: string;
  badge?: string;
}

export interface ExportMessageStats {
  messages: number;
  userMessages: number;
  assistantMessages: number;
  tokens: number;
}

export interface BeautifulExportDialogProps {
  session: Session;
  trigger?: React.ReactNode;
}
