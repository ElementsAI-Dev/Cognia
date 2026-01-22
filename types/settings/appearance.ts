/**
 * Appearance Settings Type Definitions
 * Centralized types for appearance and theme settings
 */

import type { CustomTheme } from '@/stores';
import type { BackgroundLayerSettings, BackgroundSettings, BackgroundSlideshowSettings } from '@/lib/themes';

/**
 * Theme export data structure for JSON export/import
 */
export interface ThemeExportData {
  version: string;
  exportedAt: string;
  themes: CustomTheme[];
}

/**
 * Background export data structure for JSON export/import
 */
export interface BackgroundExportData {
  version: string;
  exportedAt: string;
  settings: Omit<
    BackgroundSettings,
    'localAssetId' | 'layers' | 'slideshow'
  > & {
    layers: Array<Omit<BackgroundLayerSettings, 'localAssetId'>>;
    slideshow: Omit<BackgroundSlideshowSettings, 'slides'> & {
      slides: Array<Omit<BackgroundLayerSettings, 'localAssetId'>>;
    };
  }; // Don't export local asset IDs
}

/**
 * Theme editor component props
 */
export interface ThemeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingThemeId: string | null;
}

/**
 * Theme preview component props
 */
export interface ThemePreviewProps {
  preset?: string;
  customTheme?: CustomTheme;
  isDarkMode?: boolean;
  children: React.ReactNode;
}
