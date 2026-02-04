/**
 * QR Code Style Presets
 *
 * Predefined style configurations for qr-code-styling library
 */

import type { DotType, CornerSquareType, CornerDotType } from 'qr-code-styling';

export interface QRColors {
  dots: string;
  cornersSquare: string;
  cornersDot: string;
  background: string;
}

export interface QRGradient {
  type: 'linear' | 'radial';
  rotation?: number;
  colorStops: Array<{ offset: number; color: string }>;
}

export interface QRPreset {
  id: string;
  name: string;
  nameZh: string;
  dotsType: DotType;
  cornersSquareType: CornerSquareType;
  cornersDotType: CornerDotType;
  colors: QRColors;
  gradient?: QRGradient;
}

/**
 * Default QR code presets
 */
export const QR_PRESETS: QRPreset[] = [
  {
    id: 'default',
    name: 'Default',
    nameZh: '默认',
    dotsType: 'square',
    cornersSquareType: 'square',
    cornersDotType: 'square',
    colors: {
      dots: '#000000',
      cornersSquare: '#000000',
      cornersDot: '#000000',
      background: '#ffffff',
    },
  },
  {
    id: 'rounded',
    name: 'Rounded',
    nameZh: '圆角',
    dotsType: 'rounded',
    cornersSquareType: 'extra-rounded',
    cornersDotType: 'dot',
    colors: {
      dots: '#333333',
      cornersSquare: '#333333',
      cornersDot: '#333333',
      background: '#ffffff',
    },
  },
  {
    id: 'dots',
    name: 'Dots',
    nameZh: '圆点',
    dotsType: 'dots',
    cornersSquareType: 'dot',
    cornersDotType: 'dot',
    colors: {
      dots: '#1a1a1a',
      cornersSquare: '#1a1a1a',
      cornersDot: '#1a1a1a',
      background: '#ffffff',
    },
  },
  {
    id: 'classy',
    name: 'Classy',
    nameZh: '经典',
    dotsType: 'classy',
    cornersSquareType: 'extra-rounded',
    cornersDotType: 'dot',
    colors: {
      dots: '#2c3e50',
      cornersSquare: '#2c3e50',
      cornersDot: '#2c3e50',
      background: '#ffffff',
    },
  },
  {
    id: 'wechat',
    name: 'WeChat',
    nameZh: '微信',
    dotsType: 'rounded',
    cornersSquareType: 'extra-rounded',
    cornersDotType: 'dot',
    colors: {
      dots: '#07c160',
      cornersSquare: '#07c160',
      cornersDot: '#07c160',
      background: '#ffffff',
    },
  },
  {
    id: 'cognia',
    name: 'Cognia',
    nameZh: 'Cognia',
    dotsType: 'classy-rounded',
    cornersSquareType: 'extra-rounded',
    cornersDotType: 'dot',
    colors: {
      dots: '#6366f1',
      cornersSquare: '#4f46e5',
      cornersDot: '#4338ca',
      background: '#ffffff',
    },
  },
  {
    id: 'gradient-blue',
    name: 'Gradient Blue',
    nameZh: '蓝色渐变',
    dotsType: 'rounded',
    cornersSquareType: 'extra-rounded',
    cornersDotType: 'dot',
    colors: {
      dots: '#3b82f6',
      cornersSquare: '#1d4ed8',
      cornersDot: '#1e40af',
      background: '#ffffff',
    },
    gradient: {
      type: 'linear',
      rotation: 45,
      colorStops: [
        { offset: 0, color: '#3b82f6' },
        { offset: 1, color: '#8b5cf6' },
      ],
    },
  },
  {
    id: 'gradient-sunset',
    name: 'Gradient Sunset',
    nameZh: '日落渐变',
    dotsType: 'extra-rounded',
    cornersSquareType: 'extra-rounded',
    cornersDotType: 'dot',
    colors: {
      dots: '#f97316',
      cornersSquare: '#ea580c',
      cornersDot: '#c2410c',
      background: '#ffffff',
    },
    gradient: {
      type: 'linear',
      rotation: 135,
      colorStops: [
        { offset: 0, color: '#f97316' },
        { offset: 1, color: '#ec4899' },
      ],
    },
  },
];

/**
 * Get preset by ID
 */
export function getPresetById(id: string): QRPreset | undefined {
  return QR_PRESETS.find((preset) => preset.id === id);
}

/**
 * Get default preset
 */
export function getDefaultPreset(): QRPreset {
  return QR_PRESETS[0];
}

/**
 * Get preset for WeChat
 */
export function getWeChatPreset(): QRPreset {
  return QR_PRESETS.find((preset) => preset.id === 'wechat') || getDefaultPreset();
}

/**
 * Get Cognia brand preset
 */
export function getCogniaPreset(): QRPreset {
  return QR_PRESETS.find((preset) => preset.id === 'cognia') || getDefaultPreset();
}
