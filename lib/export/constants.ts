/**
 * Export module constants - shared configuration objects for export dialogs
 */

import {
  FileText,
  FileType,
  Code2,
  Play,
  FileSpreadsheet,
  BookOpen,
  Sparkles,
  Table2,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { MARGIN_PRESETS } from '@/types/document/document-formatting';
import type { PageLayoutSettings } from '@/components/document/page-layout-dialog';
import type {
  BeautifulExportFormat,
  BeautifulExportOptions,
  FormatConfigItem,
} from '@/types/export/beautiful-export';
import type { ThemeOptionItem, ScaleOptionItem } from '@/types/export/image-export';

export const DEFAULT_PAGE_LAYOUT: PageLayoutSettings = {
  pageSize: 'a4',
  orientation: 'portrait',
  margins: MARGIN_PRESETS.normal,
  headerEnabled: false,
  footerEnabled: true,
  showPageNumbers: true,
};

export const DEFAULT_EXPORT_OPTIONS: BeautifulExportOptions = {
  theme: 'system',
  syntaxTheme: 'one-dark-pro',
  showTimestamps: true,
  showTokens: false,
  showThinkingProcess: true,
  showToolCalls: true,
  includeCoverPage: true,
  includeTableOfContents: true,
  syntaxHighlighting: true,
  compactMode: false,
  pageLayout: DEFAULT_PAGE_LAYOUT,
};

export const FORMAT_CONFIG: Record<BeautifulExportFormat, FormatConfigItem> = {
  'beautiful-html': {
    icon: Sparkles,
    label: 'Beautiful HTML',
    description: 'Modern, responsive HTML with syntax highlighting',
    extension: '.html',
    badge: 'Recommended',
  },
  pdf: {
    icon: FileType,
    label: 'PDF Document',
    description: 'Professional PDF with cover page',
    extension: '.pdf',
  },
  markdown: {
    icon: FileText,
    label: 'Rich Markdown',
    description: 'GitHub-flavored markdown with metadata',
    extension: '.md',
  },
  word: {
    icon: BookOpen,
    label: 'Word Document',
    description: 'Microsoft Word format (.docx)',
    extension: '.docx',
  },
  excel: {
    icon: FileSpreadsheet,
    label: 'Excel Spreadsheet',
    description: 'Tabular format with statistics',
    extension: '.xlsx',
  },
  csv: {
    icon: Table2,
    label: 'CSV Spreadsheet',
    description: 'CSV format for Google Sheets import',
    extension: '.csv',
  },
  'animated-html': {
    icon: Play,
    label: 'Animated HTML',
    description: 'Interactive replay with typewriter effect',
    extension: '.html',
  },
  json: {
    icon: Code2,
    label: 'JSON Data',
    description: 'Complete structured data export',
    extension: '.json',
  },
};

export const IMAGE_THEME_OPTIONS: ThemeOptionItem[] = [
  { value: 'light', labelKey: 'lightTheme', icon: Sun },
  { value: 'dark', labelKey: 'darkTheme', icon: Moon },
  { value: 'system', labelKey: 'systemTheme', icon: Monitor },
];

export const IMAGE_SCALE_OPTIONS: ScaleOptionItem[] = [
  { value: 1, labelKey: 'scale1x' },
  { value: 2, labelKey: 'scale2x' },
  { value: 3, labelKey: 'scale3x' },
];
