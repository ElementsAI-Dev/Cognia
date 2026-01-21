/**
 * Tool Settings Type Definitions
 *
 * Types for tool configuration, skill management, and source verification settings.
 */

import type { ReactNode } from 'react';

/**
 * Individual tool item within a tool category
 */
export interface ToolItem {
  /** Tool identifier (e.g., 'file_read', 'file_write') */
  name: string;
  /** i18n key for tool description */
  descriptionKey: string;
  /** Whether this tool requires user approval before execution */
  requiresApproval: boolean;
}

/**
 * Tool category configuration (without runtime state)
 * Used for defining tool category structure
 */
export interface ToolCategoryConfig {
  /** Unique category identifier */
  id: string;
  /** i18n key for category name */
  nameKey: string;
  /** i18n key for category description */
  descriptionKey: string;
  /** Whether any tool in this category requires approval */
  requiresApproval?: boolean;
  /** Tools in this category */
  tools: ToolItem[];
}

/**
 * Tool category with runtime state
 * Used in component for rendering with dynamic state
 */
export interface ToolCategory extends ToolCategoryConfig {
  /** Icon component to display */
  icon: ReactNode;
  /** Whether this category is currently enabled */
  enabled: boolean;
  /** Callback to toggle enabled state */
  setEnabled: (enabled: boolean) => void;
}

/**
 * Props for SourceVerificationSettings component
 */
export interface SourceVerificationSettingsProps {
  /** Additional CSS classes */
  className?: string;
  /** Render in compact mode */
  compact?: boolean;
}

/**
 * Verification mode label and description keys
 */
export interface VerificationModeInfo {
  /** i18n key for mode label */
  label: string;
  /** i18n key for mode description */
  description: string;
}
