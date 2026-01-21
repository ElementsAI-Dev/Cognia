/**
 * File Validation - File type and content validation utilities
 */

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
}

/**
 * Magic number signatures for common file types
 */
const FILE_SIGNATURES: Record<string, { signature: number[]; mimeType: string }> = {
  // Images
  PNG: { signature: [0x89, 0x50, 0x4e, 0x47], mimeType: 'image/png' },
  JPEG: { signature: [0xff, 0xd8, 0xff], mimeType: 'image/jpeg' },
  GIF: { signature: [0x47, 0x49, 0x46, 0x38], mimeType: 'image/gif' },
  WEBP: { signature: [0x52, 0x49, 0x46, 0x46], mimeType: 'image/webp' }, // RIFF
  BMP: { signature: [0x42, 0x4d], mimeType: 'image/bmp' },
  
  // Documents
  PDF: { signature: [0x25, 0x50, 0x44, 0x46], mimeType: 'application/pdf' }, // %PDF
  ZIP: { signature: [0x50, 0x4b, 0x03, 0x04], mimeType: 'application/zip' }, // Also used by docx, xlsx
  
  // Audio
  MP3: { signature: [0x49, 0x44, 0x33], mimeType: 'audio/mpeg' }, // ID3
  WAV: { signature: [0x52, 0x49, 0x46, 0x46], mimeType: 'audio/wav' }, // RIFF
  OGG: { signature: [0x4f, 0x67, 0x67, 0x53], mimeType: 'audio/ogg' }, // OggS
  
  // Video
  MP4: { signature: [0x66, 0x74, 0x79, 0x70], mimeType: 'video/mp4' }, // ftyp (at offset 4)
  AVI: { signature: [0x52, 0x49, 0x46, 0x46], mimeType: 'video/avi' }, // RIFF
  
  // Archives
  GZIP: { signature: [0x1f, 0x8b], mimeType: 'application/gzip' },
  RAR: { signature: [0x52, 0x61, 0x72, 0x21], mimeType: 'application/x-rar-compressed' },
};

/**
 * Check file magic number to verify file type
 */
export function checkMagicNumber(buffer: ArrayBuffer, expectedMimeType?: string): FileValidationResult {
  const uint8Array = new Uint8Array(buffer);
  
  // Check against known signatures
  for (const [name, { signature, mimeType }] of Object.entries(FILE_SIGNATURES)) {
    let matches = true;
    
    // Handle special cases
    if (name === 'MP4') {
      // MP4 signature is at offset 4
      for (let i = 0; i < signature.length; i++) {
        if (uint8Array[i + 4] !== signature[i]) {
          matches = false;
          break;
        }
      }
    } else if (name === 'WEBP' || name === 'WAV' || name === 'AVI') {
      // RIFF-based formats - check additional bytes
      for (let i = 0; i < signature.length; i++) {
        if (uint8Array[i] !== signature[i]) {
          matches = false;
          break;
        }
      }
      
      if (matches && name === 'WEBP') {
        // Verify 'WEBP' string at offset 8
        const webpCheck = uint8Array[8] === 0x57 && uint8Array[9] === 0x45 && 
                         uint8Array[10] === 0x42 && uint8Array[11] === 0x50;
        matches = webpCheck;
      }
    } else {
      // Standard signature check
      for (let i = 0; i < signature.length; i++) {
        if (uint8Array[i] !== signature[i]) {
          matches = false;
          break;
        }
      }
    }
    
    if (matches) {
      // If expectedMimeType is provided, verify it matches
      if (expectedMimeType && expectedMimeType !== mimeType) {
        return {
          valid: false,
          error: `File type mismatch: expected ${expectedMimeType}, detected ${mimeType}`,
          mimeType,
        };
      }
      
      return {
        valid: true,
        mimeType,
      };
    }
  }
  
  // Unknown file type
  if (expectedMimeType) {
    return {
      valid: false,
      error: `Could not verify file type: ${expectedMimeType}`,
    };
  }
  
  return {
    valid: true,
    error: 'Unknown file type - magic number not recognized',
  };
}

/**
 * Validate file based on File object
 */
export function validateFile(
  file: File,
  options: {
    allowedTypes?: string[]; // MIME types like 'image/*', 'image/png', etc.
    maxSize?: number;
    checkMagicNumber?: boolean;
  } = {}
): FileValidationResult {
  const { allowedTypes, maxSize, checkMagicNumber: shouldCheckMagic } = options;
  
  // Check file size
  if (maxSize && file.size > maxSize) {
    return {
      valid: false,
      error: `File size ${file.size} bytes exceeds maximum ${maxSize} bytes`,
    };
  }
  
  // Check MIME type
  if (allowedTypes && allowedTypes.length > 0) {
    const isAllowed = allowedTypes.some((type) => {
      if (type === '*/*') return true;
      if (type.endsWith('/*')) {
        const category = type.slice(0, -2);
        return file.type.startsWith(category + '/');
      }
      return file.type === type;
    });
    
    if (!isAllowed) {
      return {
        valid: false,
        error: `File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      };
    }
  }
  
  // Magic number check requires async reading
  // Return valid for now, caller should use validateFileAsync for magic number check
  if (shouldCheckMagic) {
    return {
      valid: true,
      mimeType: file.type,
      error: 'Use validateFileAsync for magic number validation',
    };
  }
  
  return {
    valid: true,
    mimeType: file.type,
  };
}

/**
 * Validate file with async magic number check
 */
export async function validateFileAsync(
  file: File,
  options: {
    allowedTypes?: string[];
    maxSize?: number;
    checkMagicNumber?: boolean;
  } = {}
): Promise<FileValidationResult> {
  // First do synchronous checks
  const syncResult = validateFile(file, { ...options, checkMagicNumber: false });
  if (!syncResult.valid) {
    return syncResult;
  }
  
  // Magic number check if requested
  if (options.checkMagicNumber) {
    try {
      // Read first 16 bytes for magic number check
      const slice = file.slice(0, 16);
      const buffer = await slice.arrayBuffer();
      
      return checkMagicNumber(buffer, file.type);
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to read file for validation',
      };
    }
  }
  
  return syncResult;
}

/**
 * Check if a file extension is allowed
 */
export function isExtensionAllowed(filename: string, allowedExtensions: string[]): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return false;
  
  return allowedExtensions.some((allowed) => {
    const normalized = allowed.toLowerCase().replace(/^\./, '');
    return ext === normalized;
  });
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string | undefined {
  if (filename.startsWith('.') && filename.indexOf('.', 1) === -1) {
    return undefined; // Dotfiles like .gitignore
  }
  
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() : undefined;
}

/**
 * Validate filename (no dangerous characters)
 */
export function isFilenameSafe(filename: string): boolean {
  // Check for dangerous characters
  const dangerousChars = /[<>:"|?*\x00-\x1f]/;
  if (dangerousChars.test(filename)) {
    return false;
  }
  
  // Check for reserved names on Windows
  const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
  if (reservedNames.test(filename)) {
    return false;
  }
  
  // Check for path traversal in filename
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  
  return true;
}
