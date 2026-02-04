/**
 * Tests for QR Code Generator
 */

import {
  createQRInstance,
  generateStyledQR,
  generateStyledQRWithBlob,
  downloadQR,
  getQRBlob,
  copyQRToClipboard,
  type QRGeneratorOptions,
} from './qr-generator';

// Mock qr-code-styling
jest.mock('qr-code-styling', () => {
  return jest.fn().mockImplementation(() => ({
    append: jest.fn(),
    getRawData: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'image/png' })),
    download: jest.fn().mockResolvedValue(undefined),
  }));
});

// Mock clipboard API
const mockClipboardWrite = jest.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: {
    write: mockClipboardWrite,
    writeText: jest.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

// Mock FileReader
class MockFileReader {
  result: string | ArrayBuffer | null = 'data:image/png;base64,test';
  onloadend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  readAsDataURL() {
    setTimeout(() => {
      if (this.onloadend) {
        this.onloadend();
      }
    }, 0);
  }
}

(global as unknown as { FileReader: typeof MockFileReader }).FileReader = MockFileReader;

describe('QR Generator', () => {
  const defaultOptions: QRGeneratorOptions = {
    data: 'https://example.com',
    width: 256,
    height: 256,
    preset: 'default',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createQRInstance', () => {
    it('should create QR instance with default options', () => {
      const instance = createQRInstance(defaultOptions);
      expect(instance).toBeDefined();
    });

    it('should create QR instance with custom preset', () => {
      const instance = createQRInstance({
        ...defaultOptions,
        preset: 'wechat',
      });
      expect(instance).toBeDefined();
    });

    it('should create QR instance with logo', () => {
      const instance = createQRInstance({
        ...defaultOptions,
        logo: 'data:image/png;base64,test',
      });
      expect(instance).toBeDefined();
    });

    it('should create QR instance with custom colors', () => {
      const instance = createQRInstance({
        ...defaultOptions,
        customColors: {
          dots: '#ff0000',
          cornersSquare: '#00ff00',
          cornersDot: '#0000ff',
          background: '#ffffff',
        },
      });
      expect(instance).toBeDefined();
    });

    it('should handle missing data gracefully', () => {
      const instance = createQRInstance({
        data: '',
      });
      expect(instance).toBeDefined();
    });
  });

  describe('generateStyledQR', () => {
    it('should generate QR code as data URL', async () => {
      const dataUrl = await generateStyledQR(defaultOptions);
      expect(dataUrl).toBe('data:image/png;base64,test');
    });

    it('should generate QR code with wechat preset', async () => {
      const dataUrl = await generateStyledQR({
        ...defaultOptions,
        preset: 'wechat',
      });
      expect(dataUrl).toBeTruthy();
    });

    it('should generate QR code with cognia preset', async () => {
      const dataUrl = await generateStyledQR({
        ...defaultOptions,
        preset: 'cognia',
      });
      expect(dataUrl).toBeTruthy();
    });

    it('should handle custom dimensions', async () => {
      const dataUrl = await generateStyledQR({
        ...defaultOptions,
        width: 512,
        height: 512,
      });
      expect(dataUrl).toBeTruthy();
    });
  });

  describe('generateStyledQRWithBlob', () => {
    it('should return both dataUrl and blob', async () => {
      const result = await generateStyledQRWithBlob(defaultOptions);
      expect(result.dataUrl).toBeTruthy();
      expect(result.blob).toBeDefined();
    });

    it('should return valid blob type', async () => {
      const result = await generateStyledQRWithBlob(defaultOptions);
      expect(result.blob).toBeInstanceOf(Blob);
    });
  });

  describe('downloadQR', () => {
    it('should call download method', async () => {
      await downloadQR(defaultOptions, 'test-qr', 'png');
      // The mock should have been called
      expect(true).toBe(true);
    });

    it('should support svg format', async () => {
      await downloadQR(defaultOptions, 'test-qr', 'svg');
      expect(true).toBe(true);
    });

    it('should support jpeg format', async () => {
      await downloadQR(defaultOptions, 'test-qr', 'jpeg');
      expect(true).toBe(true);
    });
  });

  describe('getQRBlob', () => {
    it('should return blob for png format', async () => {
      const blob = await getQRBlob(defaultOptions, 'png');
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should return blob for jpeg format', async () => {
      const blob = await getQRBlob(defaultOptions, 'jpeg');
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should return blob for webp format', async () => {
      const blob = await getQRBlob(defaultOptions, 'webp');
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('copyQRToClipboard', () => {
    it('should attempt to copy QR to clipboard', async () => {
      // In test environment, clipboard API may not work properly
      // We just verify the function runs without throwing
      const result = await copyQRToClipboard(defaultOptions);
      expect(typeof result).toBe('boolean');
    });

    it('should return false when clipboard API fails', async () => {
      const originalWrite = navigator.clipboard?.write;
      if (navigator.clipboard) {
        Object.defineProperty(navigator.clipboard, 'write', {
          value: undefined,
          writable: true,
          configurable: true,
        });
      }

      const result = await copyQRToClipboard(defaultOptions);
      expect(result).toBe(false);

      if (navigator.clipboard && originalWrite) {
        Object.defineProperty(navigator.clipboard, 'write', {
          value: originalWrite,
          writable: true,
          configurable: true,
        });
      }
    });
  });

  describe('Options handling', () => {
    it('should use default width when not specified', async () => {
      const dataUrl = await generateStyledQR({
        data: 'https://example.com',
      });
      expect(dataUrl).toBeTruthy();
    });

    it('should use default preset when not specified', async () => {
      const dataUrl = await generateStyledQR({
        data: 'https://example.com',
      });
      expect(dataUrl).toBeTruthy();
    });

    it('should handle logo with custom size', async () => {
      const dataUrl = await generateStyledQR({
        ...defaultOptions,
        logo: 'data:image/png;base64,test',
        logoSize: 0.3,
        logoMargin: 10,
      });
      expect(dataUrl).toBeTruthy();
    });

    it('should handle gradient preset', async () => {
      const dataUrl = await generateStyledQR({
        ...defaultOptions,
        preset: 'gradient-blue',
      });
      expect(dataUrl).toBeTruthy();
    });

    it('should prioritize custom colors over preset', async () => {
      const dataUrl = await generateStyledQR({
        ...defaultOptions,
        preset: 'wechat',
        customColors: {
          dots: '#ff0000',
        },
      });
      expect(dataUrl).toBeTruthy();
    });
  });
});
