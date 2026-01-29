/**
 * Storage Compression Utilities
 * Compression and decompression for large storage data
 */

/**
 * Compression options
 */
export interface CompressionOptions {
  /** Minimum size to compress (bytes) */
  minSize?: number;
  /** Compression level (0-9, higher = more compression) */
  level?: number;
}

const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  minSize: 1024, // 1KB minimum
  level: 6,
};

/**
 * Compress a string using CompressionStream API (if available)
 * Falls back to storing uncompressed if not supported
 */
export async function compressString(data: string): Promise<{
  compressed: boolean;
  data: string;
}> {
  // Check if CompressionStream is available
  if (typeof CompressionStream === 'undefined') {
    return { compressed: false, data };
  }

  // Don't compress small data
  if (data.length < DEFAULT_COMPRESSION_OPTIONS.minSize!) {
    return { compressed: false, data };
  }

  try {
    const encoder = new TextEncoder();
    const inputBytes = encoder.encode(data);
    
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    writer.write(inputBytes);
    writer.close();

    const compressedChunks: Uint8Array[] = [];
    const reader = stream.readable.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      compressedChunks.push(value);
    }

    // Combine chunks
    const totalLength = compressedChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const compressedData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of compressedChunks) {
      compressedData.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert to base64 for storage
    const base64 = btoa(String.fromCharCode(...compressedData));

    // Only use compressed if it's actually smaller
    if (base64.length < data.length) {
      return { compressed: true, data: base64 };
    }

    return { compressed: false, data };
  } catch (error) {
    console.warn('Compression failed, storing uncompressed:', error);
    return { compressed: false, data };
  }
}

/**
 * Decompress a string
 */
export async function decompressString(compressedData: string): Promise<string> {
  // Check if DecompressionStream is available
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream not supported');
  }

  try {
    // Convert from base64
    const binaryString = atob(compressedData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    writer.write(bytes);
    writer.close();

    const decompressedChunks: Uint8Array[] = [];
    const reader = stream.readable.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      decompressedChunks.push(value);
    }

    // Combine and decode
    const totalLength = decompressedChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const decompressedData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of decompressedChunks) {
      decompressedData.set(chunk, offset);
      offset += chunk.length;
    }

    const decoder = new TextDecoder();
    return decoder.decode(decompressedData);
  } catch (error) {
    console.error('Decompression failed:', error);
    throw error;
  }
}

/**
 * Compressed storage wrapper
 * Automatically compresses/decompresses data when storing/retrieving
 */
export class CompressedStorage {
  private prefix: string;

  constructor(prefix = 'compressed-') {
    this.prefix = prefix;
  }

  /**
   * Store data with optional compression
   */
  async setItem(key: string, value: string): Promise<void> {
    const { compressed, data } = await compressString(value);
    
    const storageKey = this.prefix + key;
    const storageValue = JSON.stringify({
      compressed,
      data,
      originalSize: value.length,
      storedAt: Date.now(),
    });

    localStorage.setItem(storageKey, storageValue);
  }

  /**
   * Retrieve and decompress data
   */
  async getItem(key: string): Promise<string | null> {
    const storageKey = this.prefix + key;
    const stored = localStorage.getItem(storageKey);

    if (!stored) return null;

    try {
      const { compressed, data } = JSON.parse(stored);

      if (compressed) {
        return await decompressString(data);
      }

      return data;
    } catch (error) {
      console.error('Failed to retrieve compressed item:', error);
      return null;
    }
  }

  /**
   * Remove item
   */
  removeItem(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  /**
   * Get storage info for a key
   */
  getItemInfo(key: string): {
    compressed: boolean;
    originalSize: number;
    storedSize: number;
    compressionRatio: number;
    storedAt: number;
  } | null {
    const storageKey = this.prefix + key;
    const stored = localStorage.getItem(storageKey);

    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored);
      return {
        compressed: parsed.compressed,
        originalSize: parsed.originalSize,
        storedSize: stored.length,
        compressionRatio: parsed.originalSize > 0 ? stored.length / parsed.originalSize : 1,
        storedAt: parsed.storedAt,
      };
    } catch {
      return null;
    }
  }
}

/**
 * LZ-String based compression (lightweight, no async)
 * Useful for smaller data that needs synchronous compression
 */
export const LZString = {
  /**
   * Compress string to UTF-16 encoded compressed string
   */
  compress(input: string): string {
    if (!input) return '';
    
    const keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    const dict: Record<string, number> = {};
    const data = (input + '').split('');
    const out: string[] = [];
    let currChar: string;
    let phrase = data[0];
    let code = 256;
    
    for (let i = 1; i < data.length; i++) {
      currChar = data[i];
      if (dict[phrase + currChar] != null) {
        phrase += currChar;
      } else {
        out.push(phrase.length > 1 ? String(dict[phrase]) : String(phrase.charCodeAt(0)));
        dict[phrase + currChar] = code;
        code++;
        phrase = currChar;
      }
    }
    out.push(phrase.length > 1 ? String(dict[phrase]) : String(phrase.charCodeAt(0)));
    
    // Convert to base64-like string
    let result = '';
    for (const c of out) {
      const num = parseInt(c, 10);
      if (!isNaN(num)) {
        result += keyStr.charAt(num >> 6) + keyStr.charAt(num & 63);
      } else {
        result += c;
      }
    }
    
    return result;
  },

  /**
   * Decompress UTF-16 encoded compressed string
   */
  decompress(input: string): string {
    if (!input) return '';
    
    const dict: Record<number, string> = {};
    const data = input.split('');
    let currChar = data[0];
    let oldPhrase = currChar;
    const out: string[] = [currChar];
    let code = 256;
    let phrase: string;
    
    for (let i = 1; i < data.length; i++) {
      const currCode = data[i].charCodeAt(0);
      if (currCode < 256) {
        phrase = data[i];
      } else {
        phrase = dict[currCode] ? dict[currCode] : oldPhrase + currChar;
      }
      out.push(phrase);
      currChar = phrase.charAt(0);
      dict[code] = oldPhrase + currChar;
      code++;
      oldPhrase = phrase;
    }
    
    return out.join('');
  },
};

/**
 * Check if compression is supported
 */
export function isCompressionSupported(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

/**
 * Calculate compression ratio
 */
export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  if (originalSize === 0) return 1;
  return compressedSize / originalSize;
}

/**
 * Format compression ratio as percentage
 */
export function formatCompressionRatio(ratio: number): string {
  const savings = (1 - ratio) * 100;
  return `${savings.toFixed(1)}% smaller`;
}
