/**
 * Document Chunking - Split documents into smaller chunks for embedding
 * Supports multiple chunking strategies
 */

export type ChunkingStrategy = 'fixed' | 'sentence' | 'paragraph' | 'semantic';

export interface ChunkingOptions {
  strategy: ChunkingStrategy;
  chunkSize: number;
  chunkOverlap: number;
  minChunkSize?: number;
  maxChunkSize?: number;
}

export interface DocumentChunk {
  id: string;
  content: string;
  index: number;
  startOffset: number;
  endOffset: number;
  metadata?: Record<string, unknown>;
}

export interface ChunkingResult {
  chunks: DocumentChunk[];
  totalChunks: number;
  originalLength: number;
  strategy: ChunkingStrategy;
}

const DEFAULT_OPTIONS: ChunkingOptions = {
  strategy: 'fixed',
  chunkSize: 1000,
  chunkOverlap: 200,
  minChunkSize: 100,
  maxChunkSize: 2000,
};

/**
 * Split text into chunks using fixed-size strategy
 */
function fixedSizeChunking(
  text: string,
  chunkSize: number,
  overlap: number
): { content: string; start: number; end: number }[] {
  const chunks: { content: string; start: number; end: number }[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunkEnd = end;

    // Try to break at word boundary
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > start + chunkSize * 0.5) {
        chunkEnd = lastSpace;
      }
    }

    chunks.push({
      content: text.slice(start, chunkEnd).trim(),
      start,
      end: chunkEnd,
    });

    start = chunkEnd - overlap;
    if (start >= text.length) break;
  }

  return chunks;
}

/**
 * Split text into chunks by sentences
 */
function sentenceChunking(
  text: string,
  chunkSize: number,
  overlap: number
): { content: string; start: number; end: number }[] {
  // Split by sentence-ending punctuation
  const sentenceRegex = /[.!?]+[\s]+/g;
  const sentences: { text: string; start: number; end: number }[] = [];
  
  let lastIndex = 0;
  let match;
  
  while ((match = sentenceRegex.exec(text)) !== null) {
    sentences.push({
      text: text.slice(lastIndex, match.index + match[0].length).trim(),
      start: lastIndex,
      end: match.index + match[0].length,
    });
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    sentences.push({
      text: text.slice(lastIndex).trim(),
      start: lastIndex,
      end: text.length,
    });
  }

  // Group sentences into chunks
  const chunks: { content: string; start: number; end: number }[] = [];
  let currentChunk = '';
  let chunkStart = 0;
  let chunkEnd = 0;
  let sentenceBuffer: typeof sentences = [];

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.text.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        start: chunkStart,
        end: chunkEnd,
      });

      // Calculate overlap
      const overlapSentences: typeof sentences = [];
      let overlapLength = 0;
      for (let i = sentenceBuffer.length - 1; i >= 0; i--) {
        if (overlapLength + sentenceBuffer[i].text.length <= overlap) {
          overlapSentences.unshift(sentenceBuffer[i]);
          overlapLength += sentenceBuffer[i].text.length;
        } else {
          break;
        }
      }

      currentChunk = overlapSentences.map(s => s.text).join(' ');
      chunkStart = overlapSentences[0]?.start ?? sentence.start;
      sentenceBuffer = [...overlapSentences];
    }

    currentChunk += (currentChunk ? ' ' : '') + sentence.text;
    chunkEnd = sentence.end;
    sentenceBuffer.push(sentence);
  }

  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      start: chunkStart,
      end: chunkEnd,
    });
  }

  return chunks;
}

/**
 * Split text into chunks by paragraphs
 */
function paragraphChunking(
  text: string,
  chunkSize: number,
  overlap: number
): { content: string; start: number; end: number }[] {
  // Split by double newlines (paragraphs)
  const paragraphRegex = /\n\s*\n/g;
  const paragraphs: { text: string; start: number; end: number }[] = [];
  
  let lastIndex = 0;
  let match;
  
  while ((match = paragraphRegex.exec(text)) !== null) {
    const paraText = text.slice(lastIndex, match.index).trim();
    if (paraText) {
      paragraphs.push({
        text: paraText,
        start: lastIndex,
        end: match.index,
      });
    }
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  const remaining = text.slice(lastIndex).trim();
  if (remaining) {
    paragraphs.push({
      text: remaining,
      start: lastIndex,
      end: text.length,
    });
  }

  // Group paragraphs into chunks
  const chunks: { content: string; start: number; end: number }[] = [];
  let currentChunk = '';
  let chunkStart = 0;
  let chunkEnd = 0;

  for (const para of paragraphs) {
    if (currentChunk.length + para.text.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        start: chunkStart,
        end: chunkEnd,
      });

      // For paragraph chunking, we use the last paragraph as overlap
      const lastChunkContent = currentChunk.trim();
      if (lastChunkContent.length <= overlap) {
        currentChunk = lastChunkContent + '\n\n';
        // Keep the same start
      } else {
        currentChunk = '';
        chunkStart = para.start;
      }
    }

    if (!currentChunk) {
      chunkStart = para.start;
    }
    currentChunk += (currentChunk ? '\n\n' : '') + para.text;
    chunkEnd = para.end;
  }

  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      start: chunkStart,
      end: chunkEnd,
    });
  }

  return chunks;
}

/**
 * Main chunking function - splits document into chunks
 */
export function chunkDocument(
  text: string,
  options: Partial<ChunkingOptions> = {},
  documentId?: string
): ChunkingResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Clean text
  const cleanedText = text.replace(/\r\n/g, '\n').trim();
  
  if (!cleanedText) {
    return {
      chunks: [],
      totalChunks: 0,
      originalLength: 0,
      strategy: opts.strategy,
    };
  }

  let rawChunks: { content: string; start: number; end: number }[];

  switch (opts.strategy) {
    case 'sentence':
      rawChunks = sentenceChunking(cleanedText, opts.chunkSize, opts.chunkOverlap);
      break;
    case 'paragraph':
      rawChunks = paragraphChunking(cleanedText, opts.chunkSize, opts.chunkOverlap);
      break;
    case 'semantic':
      // Semantic chunking falls back to sentence for now
      // Could be enhanced with AI-based splitting
      rawChunks = sentenceChunking(cleanedText, opts.chunkSize, opts.chunkOverlap);
      break;
    case 'fixed':
    default:
      rawChunks = fixedSizeChunking(cleanedText, opts.chunkSize, opts.chunkOverlap);
      break;
  }

  // Filter chunks by min/max size
  const filteredChunks = rawChunks.filter((chunk) => {
    const len = chunk.content.length;
    return len >= (opts.minChunkSize || 0) && len <= (opts.maxChunkSize || Infinity);
  });

  // Create DocumentChunk objects
  const chunks: DocumentChunk[] = filteredChunks.map((chunk, index) => ({
    id: documentId ? `${documentId}-chunk-${index}` : `chunk-${index}-${Date.now()}`,
    content: chunk.content,
    index,
    startOffset: chunk.start,
    endOffset: chunk.end,
  }));

  return {
    chunks,
    totalChunks: chunks.length,
    originalLength: cleanedText.length,
    strategy: opts.strategy,
  };
}

/**
 * Estimate number of chunks for a given text
 */
export function estimateChunkCount(
  textLength: number,
  chunkSize: number = 1000,
  overlap: number = 200
): number {
  if (textLength <= chunkSize) return 1;
  const effectiveChunkSize = chunkSize - overlap;
  return Math.ceil((textLength - overlap) / effectiveChunkSize);
}

/**
 * Merge overlapping chunks back into original text
 */
export function mergeChunks(chunks: DocumentChunk[]): string {
  if (chunks.length === 0) return '';
  if (chunks.length === 1) return chunks[0].content;

  // Sort by index
  const sorted = [...chunks].sort((a, b) => a.index - b.index);
  
  // Simple concatenation with deduplication
  let result = sorted[0].content;
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i].content;
    const prev = sorted[i - 1].content;
    
    // Find overlap
    let overlapStart = 0;
    for (let j = Math.min(prev.length, current.length); j > 0; j--) {
      if (prev.endsWith(current.slice(0, j))) {
        overlapStart = j;
        break;
      }
    }
    
    result += current.slice(overlapStart);
  }
  
  return result;
}

/**
 * Get chunk statistics
 */
export function getChunkStats(chunks: DocumentChunk[]): {
  count: number;
  avgLength: number;
  minLength: number;
  maxLength: number;
  totalLength: number;
} {
  if (chunks.length === 0) {
    return { count: 0, avgLength: 0, minLength: 0, maxLength: 0, totalLength: 0 };
  }

  const lengths = chunks.map((c) => c.content.length);
  const totalLength = lengths.reduce((a, b) => a + b, 0);

  return {
    count: chunks.length,
    avgLength: Math.round(totalLength / chunks.length),
    minLength: Math.min(...lengths),
    maxLength: Math.max(...lengths),
    totalLength,
  };
}
