/**
 * Types for ImageExportDialog component
 */

import type { Session } from '@/types/core';

export type ImageFormatOption = 'png' | 'jpg' | 'webp';
export type ImageScaleOption = 1 | 2 | 3;

export interface ThemeOptionItem {
  value: 'light' | 'dark' | 'system';
  labelKey: string;
  icon: React.ElementType;
}

export interface ScaleOptionItem {
  value: ImageScaleOption;
  labelKey: string;
}

export interface ImageExportDialogProps {
  session: Session;
  trigger?: React.ReactNode;
}
