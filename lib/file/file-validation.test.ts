/**
 * File Validation Tests
 */

import {
  checkMagicNumber,
  validateFile,
  validateFileAsync,
  isExtensionAllowed,
  getFileExtension,
  isFilenameSafe,
} from './file-validation';

describe('File Validation', () => {
  describe('checkMagicNumber', () => {
    it('should detect PNG files', () => {
      const pngBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer;
      const result = checkMagicNumber(pngBuffer);
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('image/png');
    });

    it('should detect JPEG files', () => {
      const jpegBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]).buffer;
      const result = checkMagicNumber(jpegBuffer);
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should detect GIF files', () => {
      const gifBuffer = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]).buffer;
      const result = checkMagicNumber(gifBuffer);
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('image/gif');
    });

    it('should detect PDF files', () => {
      const pdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]).buffer;
      const result = checkMagicNumber(pdfBuffer);
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should detect ZIP files', () => {
      const zipBuffer = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]).buffer;
      const result = checkMagicNumber(zipBuffer);
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('application/zip');
    });

    it('should detect GZIP files', () => {
      const gzipBuffer = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]).buffer;
      const result = checkMagicNumber(gzipBuffer);
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('application/gzip');
    });

    it('should detect MP3 files (ID3 header)', () => {
      const mp3Buffer = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00]).buffer;
      const result = checkMagicNumber(mp3Buffer);
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('audio/mpeg');
    });

    it('should detect OGG files', () => {
      const oggBuffer = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0x00]).buffer;
      const result = checkMagicNumber(oggBuffer);
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('audio/ogg');
    });

    it('should detect RAR files', () => {
      const rarBuffer = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a]).buffer;
      const result = checkMagicNumber(rarBuffer);
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('application/x-rar-compressed');
    });

    it('should detect BMP files', () => {
      const bmpBuffer = new Uint8Array([0x42, 0x4d, 0x00, 0x00]).buffer;
      const result = checkMagicNumber(bmpBuffer);
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('image/bmp');
    });

    it('should return valid with error for unknown file type', () => {
      const unknownBuffer = new Uint8Array([0x00, 0x00, 0x00, 0x00]).buffer;
      const result = checkMagicNumber(unknownBuffer);
      expect(result.valid).toBe(true);
      expect(result.error).toBe('Unknown file type - magic number not recognized');
    });

    it('should fail when expected MIME type does not match detected type', () => {
      const pngBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer;
      const result = checkMagicNumber(pngBuffer, 'image/jpeg');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type mismatch');
      expect(result.mimeType).toBe('image/png');
    });

    it('should pass when expected MIME type matches detected type', () => {
      const pngBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer;
      const result = checkMagicNumber(pngBuffer, 'image/png');
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('image/png');
    });

    it('should fail verification for unknown type with expected MIME', () => {
      const unknownBuffer = new Uint8Array([0x00, 0x00, 0x00, 0x00]).buffer;
      const result = checkMagicNumber(unknownBuffer, 'image/png');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Could not verify file type');
    });
  });

  describe('validateFile', () => {
    const createMockFile = (name: string, size: number, type: string): File => {
      const blob = new Blob(['x'.repeat(size)], { type });
      return new File([blob], name, { type });
    };

    it('should pass validation with no options', () => {
      const file = createMockFile('test.txt', 100, 'text/plain');
      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('text/plain');
    });

    it('should fail when file exceeds max size', () => {
      const file = createMockFile('large.txt', 1000, 'text/plain');
      const result = validateFile(file, { maxSize: 500 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should pass when file is within max size', () => {
      const file = createMockFile('small.txt', 100, 'text/plain');
      const result = validateFile(file, { maxSize: 500 });
      expect(result.valid).toBe(true);
    });

    it('should pass with wildcard MIME type', () => {
      const file = createMockFile('test.txt', 100, 'text/plain');
      const result = validateFile(file, { allowedTypes: ['*/*'] });
      expect(result.valid).toBe(true);
    });

    it('should pass with category wildcard', () => {
      const file = createMockFile('test.png', 100, 'image/png');
      const result = validateFile(file, { allowedTypes: ['image/*'] });
      expect(result.valid).toBe(true);
    });

    it('should fail when MIME type is not allowed', () => {
      const file = createMockFile('test.txt', 100, 'text/plain');
      const result = validateFile(file, { allowedTypes: ['image/*', 'application/pdf'] });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should pass with exact MIME type match', () => {
      const file = createMockFile('test.png', 100, 'image/png');
      const result = validateFile(file, { allowedTypes: ['image/png', 'image/jpeg'] });
      expect(result.valid).toBe(true);
    });

    it('should indicate magic number check requires async when requested', () => {
      const file = createMockFile('test.png', 100, 'image/png');
      const result = validateFile(file, { checkMagicNumber: true });
      expect(result.valid).toBe(true);
      expect(result.error).toContain('Use validateFileAsync');
    });
  });

  describe('validateFileAsync', () => {
    const createMockFile = (name: string, content: Uint8Array, type: string): File => {
      const blob = new Blob([content as unknown as BlobPart], { type });
      return new File([blob], name, { type });
    };

    it('should validate file with magic number check', async () => {
      const pngContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(8).fill(0)]);
      const file = createMockFile('test.png', pngContent, 'image/png');
      const result = await validateFileAsync(file, { checkMagicNumber: true });
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('image/png');
    });

    it('should fail when magic number does not match declared type', async () => {
      const pngContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(8).fill(0)]);
      const file = createMockFile('fake.jpg', pngContent, 'image/jpeg');
      const result = await validateFileAsync(file, { checkMagicNumber: true });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('mismatch');
    });

    it('should perform sync validation first', async () => {
      const content = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      const file = createMockFile('test.png', content, 'image/png');
      const result = await validateFileAsync(file, { maxSize: 1, checkMagicNumber: true });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should skip magic number check when not requested', async () => {
      const content = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      const file = createMockFile('test.txt', content, 'text/plain');
      const result = await validateFileAsync(file);
      expect(result.valid).toBe(true);
    });
  });

  describe('isExtensionAllowed', () => {
    it('should return true for allowed extensions', () => {
      expect(isExtensionAllowed('document.pdf', ['pdf', 'doc', 'docx'])).toBe(true);
      expect(isExtensionAllowed('image.PNG', ['png', 'jpg'])).toBe(true);
      expect(isExtensionAllowed('photo.JPEG', ['jpeg', 'jpg'])).toBe(true);
    });

    it('should return false for disallowed extensions', () => {
      expect(isExtensionAllowed('script.exe', ['pdf', 'doc'])).toBe(false);
      expect(isExtensionAllowed('virus.bat', ['png', 'jpg'])).toBe(false);
    });

    it('should handle extensions with leading dot', () => {
      expect(isExtensionAllowed('file.txt', ['.txt', '.md'])).toBe(true);
    });

    it('should return false for files without extension', () => {
      expect(isExtensionAllowed('noextension', ['txt', 'md'])).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isExtensionAllowed('FILE.TXT', ['txt'])).toBe(true);
      expect(isExtensionAllowed('file.txt', ['TXT'])).toBe(true);
    });
  });

  describe('getFileExtension', () => {
    it('should return extension for normal files', () => {
      expect(getFileExtension('document.pdf')).toBe('pdf');
      expect(getFileExtension('image.PNG')).toBe('png');
      expect(getFileExtension('archive.tar.gz')).toBe('gz');
    });

    it('should return undefined for files without extension', () => {
      expect(getFileExtension('README')).toBeUndefined();
      expect(getFileExtension('Makefile')).toBeUndefined();
    });

    it('should return undefined for dotfiles', () => {
      expect(getFileExtension('.gitignore')).toBeUndefined();
      expect(getFileExtension('.env')).toBeUndefined();
    });

    it('should handle dotfiles with extension', () => {
      expect(getFileExtension('.eslintrc.json')).toBe('json');
      expect(getFileExtension('.config.js')).toBe('js');
    });

    it('should return lowercase extension', () => {
      expect(getFileExtension('FILE.TXT')).toBe('txt');
      expect(getFileExtension('Image.JPEG')).toBe('jpeg');
    });
  });

  describe('isFilenameSafe', () => {
    it('should return true for safe filenames', () => {
      expect(isFilenameSafe('document.pdf')).toBe(true);
      expect(isFilenameSafe('my-file_2024.txt')).toBe(true);
      expect(isFilenameSafe('report (1).docx')).toBe(true);
    });

    it('should return false for filenames with dangerous characters', () => {
      expect(isFilenameSafe('file<script>.txt')).toBe(false);
      expect(isFilenameSafe('file>output.txt')).toBe(false);
      expect(isFilenameSafe('file:name.txt')).toBe(false);
      expect(isFilenameSafe('file"name.txt')).toBe(false);
      expect(isFilenameSafe('file|name.txt')).toBe(false);
      expect(isFilenameSafe('file?name.txt')).toBe(false);
      expect(isFilenameSafe('file*name.txt')).toBe(false);
    });

    it('should return false for Windows reserved names', () => {
      expect(isFilenameSafe('CON')).toBe(false);
      expect(isFilenameSafe('con')).toBe(false);
      expect(isFilenameSafe('PRN')).toBe(false);
      expect(isFilenameSafe('AUX')).toBe(false);
      expect(isFilenameSafe('NUL')).toBe(false);
      expect(isFilenameSafe('COM1')).toBe(false);
      expect(isFilenameSafe('COM9')).toBe(false);
      expect(isFilenameSafe('LPT1')).toBe(false);
      expect(isFilenameSafe('LPT9')).toBe(false);
      expect(isFilenameSafe('con.txt')).toBe(false);
      expect(isFilenameSafe('NUL.exe')).toBe(false);
    });

    it('should return false for path traversal attempts', () => {
      expect(isFilenameSafe('../etc/passwd')).toBe(false);
      expect(isFilenameSafe('..\\windows\\system32')).toBe(false);
      expect(isFilenameSafe('file/../../../etc')).toBe(false);
    });

    it('should return false for filenames with slashes', () => {
      expect(isFilenameSafe('path/to/file.txt')).toBe(false);
      expect(isFilenameSafe('path\\to\\file.txt')).toBe(false);
    });

    it('should return false for filenames with control characters', () => {
      expect(isFilenameSafe('file\x00name.txt')).toBe(false);
      expect(isFilenameSafe('file\x1fname.txt')).toBe(false);
    });
  });
});
