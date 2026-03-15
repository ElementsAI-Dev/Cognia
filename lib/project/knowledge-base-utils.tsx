/**
 * Knowledge Base Utilities
 * Shared helpers for knowledge base file management
 */

import {
  FileText,
  Code,
  File,
  FileSpreadsheet,
  FileType,
  Globe,
  Presentation,
  BookOpen,
} from 'lucide-react';
import type { KnowledgeFile } from '@/types';
import { detectDocumentType, mapDocumentTypeToKnowledgeFileType } from '@/lib/document';

/**
 * Map of knowledge file types to their icon components
 */
export const FILE_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  pdf: File,
  code: Code,
  markdown: FileText,
  json: Code,
  word: FileType,
  excel: FileSpreadsheet,
  csv: FileSpreadsheet,
  html: Globe,
  presentation: Presentation,
  rtf: FileText,
  epub: BookOpen,
};

/**
 * Map of knowledge file types to their color classes
 */
export const FILE_TYPE_COLORS: Record<string, string> = {
  text: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  pdf: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  code: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  markdown: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  json: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  word: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  excel: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  csv: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  html: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  presentation: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  rtf: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
  epub: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
};

/**
 * Detect knowledge file type from filename and optional content
 */
export function detectFileType(filename: string, content?: string): KnowledgeFile['type'] {
  const docType = detectDocumentType(filename);

  const mappedType = mapDocumentTypeToKnowledgeFileType(docType);
  if (mappedType && mappedType !== 'text') return mappedType;

  // Try to detect from content for text files
  if (content) {
    if (content.startsWith('{') || content.startsWith('[')) return 'json';
    if (content.includes('```') || content.startsWith('#')) return 'markdown';
  }

  return 'text';
}
