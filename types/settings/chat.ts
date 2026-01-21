/**
 * Chat Settings Type Definitions
 * Centralized types for chat and response settings
 */

import type { CodeTheme, FontFamily } from '@/stores';
import type { RoutingMode, RoutingStrategy, ModelTier } from '@/types/provider/auto-router';
import type { TokenizerProvider } from '@/types/system/tokenizer';

/**
 * Option item for i18n-enabled select/radio options (without description)
 */
export interface I18nOptionItem<T extends string> {
  value: T;
  labelKey: string;
}

/**
 * Option item with description for i18n-enabled select/radio options
 */
export interface I18nOptionItemWithDesc<T extends string> extends I18nOptionItem<T> {
  descKey: string;
}

/**
 * Option item with icon for i18n-enabled select/radio options
 */
export interface I18nOptionItemWithIcon<T extends string> extends I18nOptionItem<T> {
  icon: React.ReactNode;
}

/**
 * Option item with icon and description for i18n-enabled select/radio options
 */
export interface I18nOptionItemWithIconAndDesc<T extends string> extends I18nOptionItemWithDesc<T> {
  icon: React.ReactNode;
}

/**
 * Code theme option for response settings
 */
export type CodeThemeOption = I18nOptionItem<CodeTheme>;

/**
 * Font family option for response settings
 */
export type FontFamilyOption = I18nOptionItem<FontFamily>;

/**
 * Routing mode option for auto-router settings (with description)
 */
export type RoutingModeOption = I18nOptionItemWithDesc<RoutingMode>;

/**
 * Routing strategy option with icon and description for auto-router settings
 */
export type RoutingStrategyOption = I18nOptionItemWithIconAndDesc<RoutingStrategy>;

/**
 * Fallback tier option with icon for auto-router settings
 */
export type FallbackTierOption = I18nOptionItemWithIcon<ModelTier>;

/**
 * Tokenizer provider option for tokenizer settings (with description)
 */
export type TokenizerProviderOption = I18nOptionItemWithDesc<TokenizerProvider>;

/**
 * Severity levels for safety rules
 */
export type SafetySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Badge variant mapping for severity levels
 */
export type SeverityBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

/**
 * Math display alignment options
 */
export type MathDisplayAlignment = 'center' | 'left';

/**
 * Mermaid diagram theme options
 */
export type MermaidTheme = 'default' | 'dark' | 'forest' | 'neutral';

/**
 * Vega-Lite chart theme options
 */
export type VegaLiteTheme = 'default' | 'dark' | 'excel' | 'fivethirtyeight';
