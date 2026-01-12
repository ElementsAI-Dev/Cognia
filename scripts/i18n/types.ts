/**
 * i18n Script Types
 *
 * Shared type definitions for all i18n scripts.
 */

export interface I18nConfig {
  targetDirectories: string[];
  excludePatterns: string[];
  extractionRules: ExtractionRules;
  namespaceMapping: Record<string, string>;
  keyGenerationRules: KeyGenerationRules;
  outputFormats: OutputFormats;
  existingTranslations: ExistingTranslations;
  backupSettings: BackupSettings;
  validation: ValidationSettings;
  cliOptions: CliOptions;
}

export interface ExtractionRules {
  includeStrings: string[];
  excludePatterns: string[];
  minLength: number;
  maxLength: number;
  excludeTechnicalStrings: boolean;
  excludeDebugStrings: boolean;
  excludeLogStrings: boolean;
  excludeCodeIdentifiers: boolean;
}

export interface KeyGenerationRules {
  format: 'camelCase' | 'snake_case' | 'kebab-case';
  maxKeyLength: number;
  prefixWithNamespace: boolean;
  removeSpecialChars: boolean;
  preserveNumbers: boolean;
  conflictResolution: 'suffix-number' | 'error' | 'skip';
  wordSeparator: string;
}

export interface OutputFormats {
  json: boolean;
  csv: boolean;
  markdown: boolean;
  html: boolean;
}

export interface ExistingTranslations {
  enPath: string;
  zhCNPath: string;
}

export interface BackupSettings {
  enabled: boolean;
  maxBackups: number;
  backupDir: string;
}

export interface ValidationSettings {
  strictMode: boolean;
  warnOnMissingKeys: boolean;
  warnOnOrphanedKeys: boolean;
  errorOnMissingTranslations: boolean;
  checkPlaceholders: boolean;
  checkInterpolation: boolean;
}

export interface CliOptions {
  verbose: boolean;
  dryRun: boolean;
  interactive: boolean;
  autoFix: boolean;
}

// Extraction types
export interface ExtractedString {
  string: string;
  type: StringType;
  line: number;
  column: number;
  suggestedKey?: string;
}

export type StringType =
  | 'JSXText'
  | 'PropString'
  | 'ButtonText'
  | 'HeadingText'
  | 'LabelText'
  | 'TemplateLiteral'
  | 'ErrorMessage'
  | 'ToastMessage';

export interface ExtractionResult {
  file: string;
  hasI18nHook: boolean;
  strings: ExtractedString[];
  error?: string;
}

export interface ComponentResult {
  file: string;
  namespace: string;
  hasI18nHook: boolean;
  hardcodedStrings: ExtractedString[];
}

export interface ExtractionReport {
  summary: ExtractionSummary;
  components: ComponentResult[];
  byNamespace: Record<string, NamespaceData>;
}

export interface ExtractionSummary {
  totalFiles: number;
  filesWithHardcodedStrings: number;
  filesWithI18n: number;
  totalHardcodedStrings: number;
}

export interface NamespaceData {
  totalComponents: number;
  totalStrings: number;
  components: string[];
}

// Validation types
export interface ValidationIssue {
  type: 'missing-zh' | 'extra-zh' | 'placeholder-mismatch' | 'empty';
  key: string;
  english?: string;
  chinese?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  summary: ValidationSummary;
  issues: ValidationIssues;
  usedKeys: Set<string>;
}

export interface ValidationSummary {
  totalFiles: number;
  filesWithI18n: number;
  filesWithHardcodedStrings: number;
  missingKeysCount: number;
  orphanedKeysCount: number;
  consistencyIssues: number;
}

export interface ValidationIssues {
  missingI18n: Array<{ file: string }>;
  hardcodedStrings: Array<{
    file: string;
    count: number;
    samples: string[];
  }>;
  missingKeys: ValidationIssue[];
  orphanedKeys: Array<{ key: string }>;
  consistency: ValidationIssue[];
}

// Merge types
export interface MergeChange {
  type: 'add' | 'add-namespace' | 'conflict' | 'skip';
  key: string;
  value?: string | Record<string, unknown>;
  existing?: string;
  new?: string;
  reason?: string;
}

export interface MergeResult {
  result: TranslationObject;
  changes: MergeChange[];
}

export interface MergeStats {
  added: number;
  addedNamespaces?: number;
  conflicts: number;
  skipped: number;
}

// Backup types
export interface BackupMetadata {
  timestamp: string;
  backupId: string;
  files: string[];
  config: {
    enPath: string;
    zhCNPath: string;
  };
}

export interface BackupInfo {
  id: string;
  timestamp: string;
  files: string[];
  size: string;
}

// Stats types
export interface NamespaceStats {
  totalKeys: number;
  emptyKeys: number;
  completedKeys: number;
  completionRate: string;
}

export interface ComponentStats {
  total: number;
  withI18n: number;
  withoutI18n: number;
  byNamespace: Record<string, { files: string[]; keyUsages: number }>;
  byDirectory: Record<string, { total: number; withI18n: number }>;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

// CLI types
export interface ParsedArgs {
  command: string | null;
  options: Record<string, string | boolean>;
  positional: string[];
}

export interface CommandDefinition {
  script?: string;
  description: string;
  alias: string;
}

// Translations type
export type TranslationValue = string | TranslationObject;
export interface TranslationObject {
  [key: string]: TranslationValue;
}
export type Translations = Record<string, TranslationObject>;
