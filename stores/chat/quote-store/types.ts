export interface QuotedText {
  id: string;
  content: string;
  messageId: string;
  messageRole: 'user' | 'assistant';
  createdAt: Date;
  isCollapsed?: boolean;
}

export type ExportFormat = 'markdown' | 'text' | 'json';

export interface QuoteStoreState {
  quotedTexts: QuotedText[];
  maxQuotes: number;
  selectedIds: Set<string>;
  isSelectionMode: boolean;
}

export interface QuoteStoreActions {
  addQuote: (quote: Omit<QuotedText, 'id' | 'createdAt'>) => void;
  removeQuote: (id: string) => void;
  clearQuotes: () => void;
  getFormattedQuotes: () => string;
  updateQuote: (id: string, content: string) => void;
  moveQuoteUp: (id: string) => void;
  moveQuoteDown: (id: string) => void;
  reorderQuotes: (fromIndex: number, toIndex: number) => void;
  toggleCollapse: (id: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
  duplicateQuote: (id: string) => void;
  toggleSelectionMode: () => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  removeSelected: () => void;
  mergeQuotes: (ids: string[]) => void;
  mergeSelected: () => void;
  exportQuotes: (format: ExportFormat, ids?: string[]) => string;
  exportSelected: (format: ExportFormat) => string;
  copyToClipboard: (text: string) => Promise<void>;
  getQuoteCount: () => number;
  canAddMore: () => boolean;
  getSelectedCount: () => number;
}

export type QuoteStore = QuoteStoreState & QuoteStoreActions;
