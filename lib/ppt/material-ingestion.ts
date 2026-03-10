import type { PPTMaterial, PPTMaterialType } from '@/types/workflow';
import { isValidHttpUrl } from './ppt-state';

export type PPTMaterialInputMode = 'import' | 'paste';

export type PPTMaterialIngestionErrorCode =
  | 'unsupported_format'
  | 'extraction_failed'
  | 'empty_content'
  | 'invalid_url';

export type PPTMaterialQualityCode =
  | 'content_too_short'
  | 'low_readability'
  | 'noisy_content';

export interface PPTMaterialIngestionError {
  code: PPTMaterialIngestionErrorCode;
  source: 'file' | 'url' | 'text';
  message: string;
  suggestion?: string;
}

export interface PPTMaterialQualityIssue {
  code: PPTMaterialQualityCode;
  materialId: string;
  materialName: string;
  message: string;
  suggestion?: string;
}

export interface PPTMaterialIngestionResult {
  materials: PPTMaterial[];
  errors: PPTMaterialIngestionError[];
}

export interface PPTMaterialQualityResult {
  isValid: boolean;
  issues: PPTMaterialQualityIssue[];
}

export interface PPTMaterialIngestionInput {
  mode: PPTMaterialInputMode;
  file?: File | null;
  importUrl?: string;
  pastedText?: string;
  now?: () => number;
  fetcher?: typeof fetch;
}

interface FileExtractionResult {
  material?: PPTMaterial;
  error?: PPTMaterialIngestionError;
}

interface UrlExtractionResult {
  material?: PPTMaterial;
  error?: PPTMaterialIngestionError;
}

const TEXT_FILE_EXTENSIONS = new Set(['txt', 'md']);
const BINARY_DOCUMENT_EXTENSIONS = new Set(['pdf', 'docx']);

const DEFAULT_MIN_READABLE_CHARS = 80;
const DEFAULT_MIN_READABLE_RATIO = 0.35;
const DEFAULT_MAX_REPEAT_RATIO = 0.45;

function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1) return '';
  return filename.slice(dotIndex + 1).toLowerCase();
}

function sanitizeText(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/\t/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function getWordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function detectLanguage(text: string): string {
  if (!text) return 'en';
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const japanese = (text.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  const korean = (text.match(/[\uac00-\ud7af]/g) || []).length;
  const total = Math.max(text.length, 1);

  if (chinese / total > 0.1) return 'zh';
  if (japanese / total > 0.1) return 'ja';
  if (korean / total > 0.1) return 'ko';
  return 'en';
}

function resolveMaterialTypeFromExtension(extension: string): PPTMaterialType {
  if (extension === 'md') return 'document';
  return 'file';
}

function getReadableRatio(text: string): number {
  if (!text.length) return 0;
  const readableChars = (text.match(/[A-Za-z0-9\u4e00-\u9fff]/g) || []).length;
  return readableChars / text.length;
}

function getDominantCharacterRatio(text: string): number {
  if (!text.length) return 0;
  const counter = new Map<string, number>();
  for (const char of text) {
    counter.set(char, (counter.get(char) || 0) + 1);
  }
  let maxCount = 0;
  for (const count of counter.values()) {
    if (count > maxCount) maxCount = count;
  }
  return maxCount / text.length;
}

async function extractTextFileMaterial(file: File, now: () => number): Promise<FileExtractionResult> {
  try {
    const content = sanitizeText(await file.text());
    if (!content) {
      return {
        error: {
          code: 'empty_content',
          source: 'file',
          message: `File "${file.name}" does not contain readable text.`,
          suggestion: 'Use a TXT/MD file with text content or paste the source content directly.',
        },
      };
    }

    const extension = getFileExtension(file.name);
    return {
      material: {
        id: `material-file-${now()}`,
        type: resolveMaterialTypeFromExtension(extension),
        name: file.name,
        content,
        mimeType: file.type || undefined,
        metadata: {
          wordCount: getWordCount(content),
          language: detectLanguage(content),
          extractedAt: new Date(),
        },
      },
    };
  } catch {
    return {
      error: {
        code: 'extraction_failed',
        source: 'file',
        message: `Failed to read file "${file.name}".`,
        suggestion: 'Please re-upload the file or copy the source text into paste mode.',
      },
    };
  }
}

async function extractFileMaterial(file: File, now: () => number): Promise<FileExtractionResult> {
  const extension = getFileExtension(file.name);
  const mimeType = file.type.toLowerCase();

  if (TEXT_FILE_EXTENSIONS.has(extension) || mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return extractTextFileMaterial(file, now);
  }

  if (
    BINARY_DOCUMENT_EXTENSIONS.has(extension) ||
    mimeType === 'application/pdf' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return {
      error: {
        code: 'extraction_failed',
        source: 'file',
        message: `File "${file.name}" cannot be reliably converted to text in this flow.`,
        suggestion: 'Please convert the document to TXT/MD or paste key sections directly.',
      },
    };
  }

  return {
    error: {
      code: 'unsupported_format',
      source: 'file',
      message: `File format "${extension || 'unknown'}" is not supported.`,
      suggestion: 'Use TXT/MD files, or switch to URL/paste input.',
    },
  };
}

function toUrlMaterial(urlValue: string, content: string, now: () => number): PPTMaterial {
  const hostname = (() => {
    try {
      return new URL(urlValue).hostname;
    } catch {
      return urlValue;
    }
  })();

  return {
    id: `material-url-${now()}`,
    type: 'url',
    name: hostname,
    url: urlValue,
    content,
    metadata: {
      wordCount: getWordCount(content),
      language: detectLanguage(content),
      extractedAt: new Date(),
    },
  };
}

async function extractUrlMaterial(
  rawUrl: string,
  now: () => number,
  fetcher?: typeof fetch
): Promise<UrlExtractionResult> {
  const urlValue = rawUrl.trim();
  if (!isValidHttpUrl(urlValue)) {
    return {
      error: {
        code: 'invalid_url',
        source: 'url',
        message: 'URL must be a valid http(s) address.',
        suggestion: 'Provide a full URL such as https://example.com/article.',
      },
    };
  }

  if (!fetcher) {
    return {
      error: {
        code: 'extraction_failed',
        source: 'url',
        message: 'URL extraction is unavailable in the current environment.',
        suggestion: 'Open the page and paste the relevant text into paste mode.',
      },
    };
  }

  try {
    const response = await fetcher(urlValue);
    if (!response.ok) {
      return {
        error: {
          code: 'extraction_failed',
          source: 'url',
          message: `Failed to fetch URL content (${response.status}).`,
          suggestion: 'Check network access or paste the content manually.',
        },
      };
    }

    const body = await response.text();
    const normalized = sanitizeText(stripHtml(body));
    if (!normalized) {
      return {
        error: {
          code: 'empty_content',
          source: 'url',
          message: 'The URL does not contain readable text content.',
          suggestion: 'Try another page URL or paste source text directly.',
        },
      };
    }

    return {
      material: toUrlMaterial(urlValue, normalized, now),
    };
  } catch {
    return {
      error: {
        code: 'extraction_failed',
        source: 'url',
        message: 'Unable to access or parse URL content.',
        suggestion: 'Paste the source text directly if the page blocks cross-origin requests.',
      },
    };
  }
}

function toPastedMaterial(text: string, now: () => number): PPTMaterial {
  const normalized = sanitizeText(text);
  return {
    id: `material-text-${now()}`,
    type: 'text',
    name: 'Pasted Content',
    content: normalized,
    metadata: {
      wordCount: getWordCount(normalized),
      language: detectLanguage(normalized),
      extractedAt: new Date(),
    },
  };
}

export async function ingestPPTMaterials(
  input: PPTMaterialIngestionInput
): Promise<PPTMaterialIngestionResult> {
  const now = input.now || Date.now;
  const errors: PPTMaterialIngestionError[] = [];
  const materials: PPTMaterial[] = [];

  if (input.mode === 'import') {
    if (input.file) {
      const fileResult = await extractFileMaterial(input.file, now);
      if (fileResult.material) {
        materials.push(fileResult.material);
      } else if (fileResult.error) {
        errors.push(fileResult.error);
      }
    }

    if (input.importUrl?.trim()) {
      const urlResult = await extractUrlMaterial(input.importUrl, now, input.fetcher || globalThis.fetch);
      if (urlResult.material) {
        materials.push(urlResult.material);
      } else if (urlResult.error) {
        errors.push(urlResult.error);
      }
    }
  } else if (input.mode === 'paste') {
    const content = sanitizeText(input.pastedText || '');
    if (!content) {
      errors.push({
        code: 'empty_content',
        source: 'text',
        message: 'Pasted content is empty after normalization.',
        suggestion: 'Paste richer source text with meaningful content.',
      });
    } else {
      materials.push(toPastedMaterial(content, now));
    }
  }

  return { materials, errors };
}

export function validatePPTMaterialQuality(
  materials: PPTMaterial[],
  options?: {
    minReadableChars?: number;
    minReadableRatio?: number;
    maxRepeatedCharRatio?: number;
  }
): PPTMaterialQualityResult {
  const minReadableChars = options?.minReadableChars ?? DEFAULT_MIN_READABLE_CHARS;
  const minReadableRatio = options?.minReadableRatio ?? DEFAULT_MIN_READABLE_RATIO;
  const maxRepeatedCharRatio = options?.maxRepeatedCharRatio ?? DEFAULT_MAX_REPEAT_RATIO;
  const issues: PPTMaterialQualityIssue[] = [];

  for (const material of materials) {
    const content = sanitizeText(material.content);
    const readableRatio = getReadableRatio(content);
    const dominantCharRatio = getDominantCharacterRatio(content);

    if (content.length < minReadableChars) {
      issues.push({
        code: 'content_too_short',
        materialId: material.id,
        materialName: material.name,
        message: `Material "${material.name}" is too short for reliable slide generation.`,
        suggestion: `Provide at least ${minReadableChars} readable characters.`,
      });
      continue;
    }

    if (readableRatio < minReadableRatio) {
      issues.push({
        code: 'low_readability',
        materialId: material.id,
        materialName: material.name,
        message: `Material "${material.name}" contains insufficient readable content.`,
        suggestion: 'Remove noisy symbols and provide clearer text sections.',
      });
      continue;
    }

    if (dominantCharRatio > maxRepeatedCharRatio) {
      issues.push({
        code: 'noisy_content',
        materialId: material.id,
        materialName: material.name,
        message: `Material "${material.name}" appears repetitive or noisy.`,
        suggestion: 'Clean repeated characters and keep only meaningful source text.',
      });
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

