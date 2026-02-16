/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddDocumentModal } from './add-document-modal';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Add Documents',
      'description': 'Upload files to collection: {collection}',
      dropHere: 'Drop files here',
      orClick: 'or click to browse',
      supportedFormats: 'Supported: .txt, .md, .json, .csv, .xml, .html',
      chunkingStrategy: 'Chunking Strategy',
      'strategy.fixed': 'Fixed Size',
      'strategy.sentence': 'Sentence',
      'strategy.paragraph': 'Paragraph',
      'strategy.semantic': 'Semantic',
      'strategy.recursive': 'Recursive',
      'strategy.sliding_window': 'Sliding Window',
      invalidType: 'Invalid file type',
      fileTooLarge: 'File exceeds 10MB limit',
      'processing': 'Processing... {progress}%',
      'stats': '{total} files: {pending} pending, {done} done, {error} errors',
      cancel: 'Cancel',
      add: 'Add Documents',
    };
    return translations[key] || key;
  },
}));

// Mock chunking
jest.mock('@/lib/ai/embedding/chunking', () => ({
  chunkDocument: jest.fn(() => ({
    chunks: [
      { id: 'chunk-1', content: 'Test content 1', index: 0, startOffset: 0, endOffset: 10 },
      { id: 'chunk-2', content: 'Test content 2', index: 1, startOffset: 10, endOffset: 20 },
    ],
    totalChunks: 2,
    originalLength: 20,
    strategy: 'fixed',
  })),
}));

// Mock Dialog components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: string }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-testid="button">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => (
    <label data-testid="label">{children}</label>
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange?.('sentence')}>Change</button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value?: number }) => (
    <div data-testid="progress" data-value={value}>Progress: {value}%</div>
  ),
}));

describe('AddDocumentModal', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnAddDocuments = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(
      <AddDocumentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        collectionName="test-collection"
        onAddDocuments={mockOnAddDocuments}
        chunkSize={1000}
        chunkOverlap={200}
      />
    );

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <AddDocumentModal
        open={false}
        onOpenChange={mockOnOpenChange}
        collectionName="test-collection"
        onAddDocuments={mockOnAddDocuments}
        chunkSize={1000}
        chunkOverlap={200}
      />
    );

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays the dialog title', () => {
    render(
      <AddDocumentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        collectionName="test-collection"
        onAddDocuments={mockOnAddDocuments}
        chunkSize={1000}
        chunkOverlap={200}
      />
    );

    expect(screen.getByTestId('dialog-title')).toHaveTextContent('addDocument.title');
  });

  it('displays drop zone instructions', () => {
    render(
      <AddDocumentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        collectionName="test-collection"
        onAddDocuments={mockOnAddDocuments}
        chunkSize={1000}
        chunkOverlap={200}
      />
    );

    expect(screen.getByText('addDocument.dropHere')).toBeInTheDocument();
    expect(screen.getByText('addDocument.orClick')).toBeInTheDocument();
  });

  it('displays supported formats', () => {
    render(
      <AddDocumentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        collectionName="test-collection"
        onAddDocuments={mockOnAddDocuments}
        chunkSize={1000}
        chunkOverlap={200}
      />
    );

    expect(screen.getByText('addDocument.supportedFormats')).toBeInTheDocument();
  });

  it('displays chunking strategy label', () => {
    render(
      <AddDocumentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        collectionName="test-collection"
        onAddDocuments={mockOnAddDocuments}
        chunkSize={1000}
        chunkOverlap={200}
      />
    );

    expect(screen.getByText('addDocument.chunkingStrategy')).toBeInTheDocument();
  });

  it('displays Cancel button', () => {
    render(
      <AddDocumentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        collectionName="test-collection"
        onAddDocuments={mockOnAddDocuments}
        chunkSize={1000}
        chunkOverlap={200}
      />
    );

    // Button text uses i18n key
    expect(screen.getByText('addDocument.cancel')).toBeInTheDocument();
  });

  it('displays Add Documents button', () => {
    render(
      <AddDocumentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        collectionName="test-collection"
        onAddDocuments={mockOnAddDocuments}
        chunkSize={1000}
        chunkOverlap={200}
      />
    );

    // Button text uses i18n key
    expect(screen.getByText('addDocument.add')).toBeInTheDocument();
  });

  it('closes modal when Cancel is clicked', () => {
    render(
      <AddDocumentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        collectionName="test-collection"
        onAddDocuments={mockOnAddDocuments}
        chunkSize={1000}
        chunkOverlap={200}
      />
    );

    const cancelButton = screen.getByText('addDocument.cancel');
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('displays select for chunking strategy', () => {
    render(
      <AddDocumentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        collectionName="test-collection"
        onAddDocuments={mockOnAddDocuments}
        chunkSize={1000}
        chunkOverlap={200}
      />
    );

    expect(screen.getByTestId('select')).toBeInTheDocument();
  });

  it('has disabled Add Documents button when no files are selected', () => {
    render(
      <AddDocumentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        collectionName="test-collection"
        onAddDocuments={mockOnAddDocuments}
        chunkSize={1000}
        chunkOverlap={200}
      />
    );

    const addButton = screen.getByText('addDocument.add');
    expect(addButton).toBeDisabled();
  });
});

describe('AddDocumentModal - File Handling', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnAddDocuments = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders file input element', () => {
    const { container } = render(
      <AddDocumentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        collectionName="test-collection"
        onAddDocuments={mockOnAddDocuments}
        chunkSize={1000}
        chunkOverlap={200}
      />
    );

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
  });

  it('accepts correct file types', () => {
    const { container } = render(
      <AddDocumentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        collectionName="test-collection"
        onAddDocuments={mockOnAddDocuments}
        chunkSize={1000}
        chunkOverlap={200}
      />
    );

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute(
      'accept',
      '.txt,.md,.json,.csv,.xml,.html,.htm,.pdf,.docx,.doc,.xlsx,.xls'
    );
  });

  it('allows multiple file selection', () => {
    const { container } = render(
      <AddDocumentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        collectionName="test-collection"
        onAddDocuments={mockOnAddDocuments}
        chunkSize={1000}
        chunkOverlap={200}
      />
    );

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute('multiple');
  });
});
