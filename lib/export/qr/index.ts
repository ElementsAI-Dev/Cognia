/**
 * QR Code Generation Module
 *
 * Provides styled QR code generation using qr-code-styling library
 */

export {
  generateStyledQR,
  generateStyledQRWithBlob,
  downloadQR,
  getQRBlob,
  getQRSvg,
  copyQRToClipboard,
  createQRInstance,
  type QRGeneratorOptions,
  type QRGeneratorResult,
} from './qr-generator';

export {
  QR_PRESETS,
  getPresetById,
  getDefaultPreset,
  getWeChatPreset,
  getCogniaPreset,
  type QRPreset,
  type QRColors,
  type QRGradient,
} from './qr-presets';
