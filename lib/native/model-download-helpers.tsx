/**
 * Model download helper functions and constants
 * Extracted from components/settings/provider/model-manager.tsx
 */

import React from 'react';
import { FileDown, Cloud, HardDrive, Globe } from 'lucide-react';

// Source display names
export const SOURCE_NAMES: Record<string, string> = {
  hugging_face: 'HuggingFace',
  model_scope: 'ModelScope (CN)',
  git_hub: 'GitHub',
  ollama: 'Ollama',
  custom: 'Custom',
};

// Category display names
export const CATEGORY_NAMES: Record<string, string> = {
  ocr: 'OCR Models',
  llm: 'Language Models',
  embedding: 'Embedding',
  vision: 'Vision',
  speech: 'Speech',
  other: 'Other',
};

// Category icons
export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  ocr: <FileDown className="w-4 h-4" />,
  llm: <Cloud className="w-4 h-4" />,
  embedding: <HardDrive className="w-4 h-4" />,
  vision: <Globe className="w-4 h-4" />,
};

// Format file size in human-readable format
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Format download speed
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatFileSize(bytesPerSecond)}/s`;
}

// Format estimated time remaining
export function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
