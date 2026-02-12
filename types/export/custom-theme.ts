/**
 * Types for CustomThemeEditor component
 */

export interface CustomThemeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingThemeId?: string | null;
  onSave?: (themeId: string) => void;
}

export type SyntaxColorKey =
  | 'background' | 'foreground' | 'comment' | 'keyword' | 'string'
  | 'number' | 'function' | 'operator' | 'property' | 'className'
  | 'constant' | 'tag' | 'attrName' | 'attrValue' | 'punctuation'
  | 'selection' | 'lineHighlight';

export interface ColorFieldConfig {
  key: SyntaxColorKey;
  labelKey: string;
  descKey: string;
}
