/**
 * PDF Parser - Extract text content from PDF files
 * Uses pdf.js (pdfjs-dist) for parsing
 */

export interface PDFParseResult {
  text: string;
  pageCount: number;
  pages: PDFPage[];
  metadata: PDFMetadata;
}

export interface PDFPage {
  pageNumber: number;
  text: string;
  width: number;
  height: number;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

/**
 * Parse PDF from ArrayBuffer
 */
export async function parsePDF(data: ArrayBuffer): Promise<PDFParseResult> {
  // Dynamic import to avoid SSR issues
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set worker source - use bundled worker
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }

  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;

  const pages: PDFPage[] = [];
  const textParts: string[] = [];

  // Extract text from each page
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    const pageText = textContent.items
      .map((item) => {
        if ('str' in item) {
          return item.str;
        }
        return '';
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    pages.push({
      pageNumber: i,
      text: pageText,
      width: viewport.width,
      height: viewport.height,
    });

    textParts.push(pageText);
  }

  // Extract metadata
  const metadataObj = await pdf.getMetadata();
  const info = metadataObj.info as Record<string, unknown>;

  const metadata: PDFMetadata = {
    title: info?.Title as string | undefined,
    author: info?.Author as string | undefined,
    subject: info?.Subject as string | undefined,
    keywords: info?.Keywords as string | undefined,
    creator: info?.Creator as string | undefined,
    producer: info?.Producer as string | undefined,
    creationDate: info?.CreationDate ? parseDate(info.CreationDate as string) : undefined,
    modificationDate: info?.ModDate ? parseDate(info.ModDate as string) : undefined,
  };

  return {
    text: textParts.join('\n\n'),
    pageCount: pdf.numPages,
    pages,
    metadata,
  };
}

/**
 * Parse PDF date string (D:YYYYMMDDHHmmSS format)
 */
function parseDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;

  // Remove "D:" prefix if present
  const cleaned = dateStr.replace(/^D:/, '');

  // Parse components
  const year = parseInt(cleaned.substring(0, 4), 10);
  const month = parseInt(cleaned.substring(4, 6), 10) - 1;
  const day = parseInt(cleaned.substring(6, 8), 10);
  const hour = parseInt(cleaned.substring(8, 10), 10) || 0;
  const minute = parseInt(cleaned.substring(10, 12), 10) || 0;
  const second = parseInt(cleaned.substring(12, 14), 10) || 0;

  if (isNaN(year)) return undefined;

  return new Date(year, month, day, hour, minute, second);
}

/**
 * Parse PDF from File object
 */
export async function parsePDFFile(file: File): Promise<PDFParseResult> {
  const buffer = await file.arrayBuffer();
  return parsePDF(buffer);
}

/**
 * Parse PDF from base64 string
 */
export async function parsePDFBase64(base64: string): Promise<PDFParseResult> {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return parsePDF(bytes.buffer);
}

/**
 * Extract embeddable content from PDF (plain text suitable for embedding)
 */
export function extractPDFEmbeddableContent(result: PDFParseResult): string {
  const parts: string[] = [];

  if (result.metadata.title) {
    parts.push(`Title: ${result.metadata.title}`);
  }

  if (result.metadata.author) {
    parts.push(`Author: ${result.metadata.author}`);
  }

  parts.push(result.text);

  return parts.join('\n\n');
}
