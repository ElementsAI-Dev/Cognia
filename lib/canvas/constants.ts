/**
 * Canvas Constants - Shared constant values for Canvas components
 */

import type { ArtifactLanguage } from '@/types';

/**
 * Language options for document creation and filtering
 */
export const LANGUAGE_OPTIONS: { value: ArtifactLanguage; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'jsx', label: 'JSX' },
  { value: 'tsx', label: 'TSX' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'yaml', label: 'YAML' },
];

/**
 * Languages available for AI translation actions
 */
export const TRANSLATE_LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'chinese', label: '中文 (Chinese)' },
  { value: 'japanese', label: '日本語 (Japanese)' },
  { value: 'korean', label: '한국어 (Korean)' },
  { value: 'spanish', label: 'Español (Spanish)' },
  { value: 'french', label: 'Français (French)' },
  { value: 'german', label: 'Deutsch (German)' },
  { value: 'russian', label: 'Русский (Russian)' },
  { value: 'portuguese', label: 'Português (Portuguese)' },
  { value: 'arabic', label: 'العربية (Arabic)' },
];
