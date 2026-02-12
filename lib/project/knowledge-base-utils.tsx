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
} from 'lucide-react';
import type { KnowledgeFile } from '@/types';
import { detectDocumentType } from '@/lib/document';

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
};

/**
 * Detect knowledge file type from filename and optional content
 */
export function detectFileType(filename: string, content?: string): KnowledgeFile['type'] {
  const docType = detectDocumentType(filename);
  
  // Map DocumentType to KnowledgeFile type
  const typeMap: Record<string, KnowledgeFile['type']> = {
    markdown: 'markdown',
    code: 'code',
    text: 'text',
    json: 'json',
    pdf: 'pdf',
    word: 'word',
    excel: 'excel',
    csv: 'csv',
    html: 'html',
    unknown: 'text',
  };

  const mappedType = typeMap[docType];
  if (mappedType && mappedType !== 'text') return mappedType;

  // Try to detect from content for text files
  if (content) {
    if (content.startsWith('{') || content.startsWith('[')) return 'json';
    if (content.includes('```') || content.startsWith('#')) return 'markdown';
  }

  return 'text';
}
