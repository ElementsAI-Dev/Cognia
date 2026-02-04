/**
 * QR Code Generator
 *
 * High-level API for generating styled QR codes using qr-code-styling
 */

import QRCodeStyling from 'qr-code-styling';
import type { Options, FileExtension } from 'qr-code-styling';
import { getPresetById, getDefaultPreset, type QRPreset } from './qr-presets';
import { loggers } from '@/lib/logger';

const log = loggers.app;

export interface QRGeneratorOptions {
  data: string;
  width?: number;
  height?: number;
  margin?: number;
  preset?: string;
  logo?: string;
  logoSize?: number;
  logoMargin?: number;
  customColors?: {
    dots?: string;
    cornersSquare?: string;
    cornersDot?: string;
    background?: string;
  };
}

export interface QRGeneratorResult {
  dataUrl: string;
  blob?: Blob;
}

/**
 * Build QRCodeStyling options from generator options
 */
function buildQROptions(options: QRGeneratorOptions): Options {
  const {
    data,
    width = 256,
    height = 256,
    margin = 10,
    preset = 'default',
    logo,
    logoSize = 0.2,
    logoMargin = 5,
    customColors,
  } = options;

  const presetConfig: QRPreset = getPresetById(preset) || getDefaultPreset();

  const qrOptions: Options = {
    width,
    height,
    type: 'svg',
    data,
    margin,
    dotsOptions: {
      color: customColors?.dots || presetConfig.colors.dots,
      type: presetConfig.dotsType,
    },
    cornersSquareOptions: {
      color: customColors?.cornersSquare || presetConfig.colors.cornersSquare,
      type: presetConfig.cornersSquareType,
    },
    cornersDotOptions: {
      color: customColors?.cornersDot || presetConfig.colors.cornersDot,
      type: presetConfig.cornersDotType,
    },
    backgroundOptions: {
      color: customColors?.background || presetConfig.colors.background,
    },
  };

  // Apply gradient if preset has one
  if (presetConfig.gradient && !customColors?.dots) {
    qrOptions.dotsOptions = {
      ...qrOptions.dotsOptions,
      gradient: {
        type: presetConfig.gradient.type,
        rotation: presetConfig.gradient.rotation || 0,
        colorStops: presetConfig.gradient.colorStops,
      },
    };
  }

  // Add logo if provided
  if (logo) {
    qrOptions.image = logo;
    qrOptions.imageOptions = {
      crossOrigin: 'anonymous',
      margin: logoMargin,
      imageSize: logoSize,
      hideBackgroundDots: true,
    };
  }

  return qrOptions;
}

/**
 * Create a QRCodeStyling instance
 */
export function createQRInstance(options: QRGeneratorOptions): QRCodeStyling {
  const qrOptions = buildQROptions(options);
  return new QRCodeStyling(qrOptions);
}

/**
 * Generate a styled QR code and return as data URL
 */
export async function generateStyledQR(options: QRGeneratorOptions): Promise<string> {
  try {
    const qrCode = createQRInstance(options);
    const blob = await qrCode.getRawData('png');

    if (!blob) {
      throw new Error('Failed to generate QR code blob');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to data URL'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    log.error('Failed to generate styled QR code', error as Error);
    throw error;
  }
}

/**
 * Generate QR code and return both data URL and blob
 */
export async function generateStyledQRWithBlob(
  options: QRGeneratorOptions
): Promise<QRGeneratorResult> {
  try {
    const qrCode = createQRInstance(options);
    const blob = await qrCode.getRawData('png');

    if (!blob) {
      throw new Error('Failed to generate QR code blob');
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to data URL'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });

    return { dataUrl, blob };
  } catch (error) {
    log.error('Failed to generate styled QR code with blob', error as Error);
    throw error;
  }
}

/**
 * Download QR code as file
 */
export async function downloadQR(
  options: QRGeneratorOptions,
  filename: string,
  format: FileExtension = 'png'
): Promise<void> {
  try {
    const qrCode = createQRInstance(options);
    await qrCode.download({
      name: filename,
      extension: format,
    });
  } catch (error) {
    log.error('Failed to download QR code', error as Error);
    throw error;
  }
}

/**
 * Get QR code as blob for clipboard operations
 */
export async function getQRBlob(
  options: QRGeneratorOptions,
  format: 'png' | 'jpeg' | 'webp' = 'png'
): Promise<Blob> {
  try {
    const qrCode = createQRInstance(options);
    const blob = await qrCode.getRawData(format);

    if (!blob) {
      throw new Error('Failed to generate QR code blob');
    }

    return blob;
  } catch (error) {
    log.error('Failed to get QR blob', error as Error);
    throw error;
  }
}

/**
 * Get QR code as SVG string
 */
export async function getQRSvg(options: QRGeneratorOptions): Promise<string> {
  try {
    const qrCode = createQRInstance({ ...options });
    const blob = await qrCode.getRawData('svg');

    if (!blob) {
      throw new Error('Failed to generate QR code SVG');
    }

    return blob.text();
  } catch (error) {
    log.error('Failed to get QR SVG', error as Error);
    throw error;
  }
}

/**
 * Copy QR code to clipboard
 */
export async function copyQRToClipboard(options: QRGeneratorOptions): Promise<boolean> {
  try {
    const blob = await getQRBlob(options, 'png');

    if (!navigator.clipboard.write) {
      throw new Error('Clipboard API not supported');
    }

    const clipboardItem = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (error) {
    log.error('Failed to copy QR to clipboard', error as Error);
    return false;
  }
}
