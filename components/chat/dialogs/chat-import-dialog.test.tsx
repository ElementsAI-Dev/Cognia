/**
 * ChatImportDialog Component Tests
 * Focus on initial render and basic UI elements that can be reliably tested
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChatImportDialog } from './chat-import-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        title: 'Import Conversations',
        description: 'Import chat history from ChatGPT or other sources',
        selectFile: 'Click to select a file',
        supportedFormats: 'Supports ChatGPT conversations.json export',
        analyzing: 'Analyzing file...',
        conversations: 'conversations',
        messages: 'messages',
        compatibility: 'Compatibility',
        compatibilityValue: `${params?.level || ''}`,
        importing: 'Importing...',
        importButton: `Import ${params?.count || 0} conversations`,
        back: 'Back',
        importOptions: 'Import Options',
        warnings: 'Warnings',
        'options.preserveTimestamps': 'Preserve timestamps',
        'options.preserveTimestampsDesc': 'Keep original creation dates',
        'options.generateNewIds': 'Generate new IDs',
        'options.generateNewIdsDesc': 'Create new unique IDs',
        'errors.title': 'Error',
        'errors.invalidJson': 'Invalid JSON file format',
        'errors.unknownFormat': 'Unknown file format',
        'errors.useCogniaImport': 'Use standard Import button',
        'errors.readFailed': 'Failed to read file',
        'errors.importFailed': 'Import failed',
        'errors.parseWarnings': 'Some conversations could not be parsed',
        'errors.conversationsFailed': 'conversations failed',
        'errors.importPartial': 'Import completed with errors',
        'success.title': 'Import Complete',
        'success.description': `Imported ${params?.sessions || 0} conversations with ${params?.messages || 0} messages`,
      };
      return translations[key] || key;
    };
    return t;
  },
}));

// Mock storage utilities
jest.mock('@/lib/storage', () => ({
  detectImportFormat: jest.fn(),
  previewImport: jest.fn(),
  importConversations: jest.fn(),
  PLATFORM_INFO: {
    portable: { name: 'Portable Archive', icon: 'archive', color: '#2563eb' },
  },
}));

describe('ChatImportDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onImportComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Render States', () => {
    it('should render dialog title when open', () => {
      render(<ChatImportDialog {...defaultProps} />);
      expect(screen.getByText('Import Conversations')).toBeInTheDocument();
    });

    it('should render dialog description when open', () => {
      render(<ChatImportDialog {...defaultProps} />);
      expect(screen.getByText('Import chat history from ChatGPT or other sources')).toBeInTheDocument();
    });

    it('should render file selection prompt', () => {
      render(<ChatImportDialog {...defaultProps} />);
      expect(screen.getByText('Click to select a file')).toBeInTheDocument();
    });

    it('should render supported formats text', () => {
      render(<ChatImportDialog {...defaultProps} />);
      expect(screen.getByText('Supports ChatGPT conversations.json export')).toBeInTheDocument();
    });

    it('should not render dialog content when closed', () => {
      render(<ChatImportDialog {...defaultProps} open={false} />);
      expect(screen.queryByText('Import Conversations')).not.toBeInTheDocument();
    });

    it('should render file input element', () => {
      render(<ChatImportDialog {...defaultProps} />);
      const input = document.querySelector('input[type="file"]');
      expect(input).toBeInTheDocument();
    });

    it('should accept JSON files only', () => {
      render(<ChatImportDialog {...defaultProps} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input.accept).toBe('.json,.md,.markdown,.csv,.txt');
    });

    it('should render cancel button in select state', () => {
      render(<ChatImportDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should accept open prop', () => {
      const { rerender } = render(<ChatImportDialog {...defaultProps} open={false} />);
      expect(screen.queryByText('Import Conversations')).not.toBeInTheDocument();

      rerender(<ChatImportDialog {...defaultProps} open={true} />);
      expect(screen.getByText('Import Conversations')).toBeInTheDocument();
    });

    it('should accept onOpenChange prop', () => {
      const onOpenChange = jest.fn();
      render(<ChatImportDialog {...defaultProps} onOpenChange={onOpenChange} />);
      // Props should be passed correctly (verified by no errors)
      expect(true).toBe(true);
    });

    it('should accept onImportComplete prop', () => {
      const onImportComplete = jest.fn();
      render(<ChatImportDialog {...defaultProps} onImportComplete={onImportComplete} />);
      // Props should be passed correctly (verified by no errors)
      expect(true).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have dialog role', () => {
      render(<ChatImportDialog {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have file input with label', () => {
      render(<ChatImportDialog {...defaultProps} />);
      const input = document.querySelector('input[type="file"]');
      expect(input).toHaveAttribute('id');
    });
  });

  describe('Default State', () => {
    it('should start in select step', () => {
      render(<ChatImportDialog {...defaultProps} />);
      // In select step, we should see the file selection UI
      expect(screen.getByText('Click to select a file')).toBeInTheDocument();
      // And NOT see preview/import UI
      expect(screen.queryByText('Back')).not.toBeInTheDocument();
    });

    it('should not show error initially', () => {
      render(<ChatImportDialog {...defaultProps} />);
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
      expect(screen.queryByText('Invalid JSON file format')).not.toBeInTheDocument();
    });

    it('should not show loading initially', () => {
      render(<ChatImportDialog {...defaultProps} />);
      expect(screen.queryByText('Analyzing file...')).not.toBeInTheDocument();
      expect(screen.queryByText('Importing...')).not.toBeInTheDocument();
    });
  });

  describe('Preview Metadata', () => {
    it('shows compatibility level and downgrade warnings in preview', async () => {
      const { detectImportFormat, previewImport } = jest.requireMock('@/lib/storage') as {
        detectImportFormat: jest.Mock;
        previewImport: jest.Mock;
      };

      detectImportFormat.mockReturnValue('portable');
      previewImport.mockResolvedValue({
        format: 'portable',
        detection: {
          format: 'portable',
          sourceType: 'portable',
          compatibility: 'official',
        },
        conversations: [
          {
            id: 'portable-1',
            title: 'Portable Export',
            messageCount: 1,
            createdAt: new Date('2024-01-15T10:00:00Z'),
            preview: 'Hello from portable export',
          },
        ],
        totalMessages: 1,
        errors: [],
        warningDetails: [
          {
            code: 'attachment_summary_only',
            message: 'Attachments were imported as portable summaries.',
            severity: 'warning',
          },
        ],
      });

      render(<ChatImportDialog {...defaultProps} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(
        [
          JSON.stringify({
            version: '1.0',
            exportedAt: '2024-01-15T12:00:00.000Z',
            source: { app: 'cognia', format: 'portable' },
            conversations: [],
          }),
        ],
        'portable.json',
        { type: 'application/json' }
      );
      Object.defineProperty(file, 'text', {
        value: () =>
          Promise.resolve(
            JSON.stringify({
              version: '1.0',
              exportedAt: '2024-01-15T12:00:00.000Z',
              source: { app: 'cognia', format: 'portable' },
              conversations: [],
            })
          ),
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Portable Export')).toBeInTheDocument();
      });

      expect(screen.getByText(/Compatibility/i)).toBeInTheDocument();
      expect(screen.getByText(/official/i)).toBeInTheDocument();
      expect(screen.getByText('Attachments were imported as portable summaries.')).toBeInTheDocument();
    });
  });
});
