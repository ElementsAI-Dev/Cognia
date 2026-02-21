/**
 * SpeedPass textbook content extractor.
 *
 * Unified extraction pipeline across Web and Tauri environments:
 * - Tauri: delegate to native runtime extraction command
 * - Web PDF: parse via pdf.js based parser
 * - Web text/markdown: plain text extraction
 */

import { isTauri } from '@/lib/utils';
import { parsePDFFile } from '@/lib/document/parsers/pdf-parser';
import { speedpassRuntime } from '@/lib/native/speedpass-runtime';
import type { ExtractTextbookResult } from '@/types/learning/speedpass';

type SupportedTextbookMime = 'application/pdf' | 'text/plain' | 'text/markdown';

function toBase64(binary: string): string {
  if (typeof btoa === 'function') {
    return btoa(binary);
  }

  return Buffer.from(binary, 'binary').toString('base64');
}

async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }

  if (typeof Response !== 'undefined') {
    return new Response(file as unknown as Blob).arrayBuffer();
  }

  throw new Error('Unable to read textbook file as ArrayBuffer');
}

async function fileToText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }

  const buffer = await fileToArrayBuffer(file);
  return new TextDecoder('utf-8').decode(buffer);
}

export interface ExtractTextbookContentInput {
  file: File;
}

function resolveMime(file: File): SupportedTextbookMime | null {
  const lowerName = file.name.toLowerCase();
  if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return 'application/pdf';
  }
  if (file.type === 'text/plain' || lowerName.endsWith('.txt')) {
    return 'text/plain';
  }
  if (file.type === 'text/markdown' || lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) {
    return 'text/markdown';
  }
  return null;
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await fileToArrayBuffer(file);
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, Math.min(index + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  return toBase64(binary);
}

async function extractViaTauri(file: File): Promise<ExtractTextbookResult> {
  const fileBytesBase64 = await fileToBase64(file);
  return speedpassRuntime.extractTextbookContent({
    fileBytesBase64,
    fileName: file.name,
    mimeType: file.type || undefined,
  });
}

async function extractViaWeb(file: File, mime: SupportedTextbookMime): Promise<ExtractTextbookResult> {
  if (mime === 'application/pdf') {
    const parsed = await parsePDFFile(file, {
      extractOutline: true,
      extractAnnotations: false,
    });
    return {
      content: parsed.text,
      source: 'bytes',
      fileName: file.name,
      pageCount: parsed.pageCount,
    };
  }

  const content = await fileToText(file);
  return {
    content,
    source: 'bytes',
    fileName: file.name,
  };
}

export async function extractTextbookContent({
  file,
}: ExtractTextbookContentInput): Promise<ExtractTextbookResult> {
  const mime = resolveMime(file);
  if (!mime) {
    throw new Error('Unsupported textbook format, please upload PDF/TXT/MD file');
  }

  if (isTauri()) {
    return extractViaTauri(file);
  }

  return extractViaWeb(file, mime);
}

export default extractTextbookContent;
