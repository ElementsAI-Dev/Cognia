import { render, screen, fireEvent, act } from '@testing-library/react';
import { BatchExportDialog } from './batch-export-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      batchExport: 'Batch Export',
      title: 'Export Sessions',
      description: 'Select sessions to export as a ZIP file',
      exportFormat: 'Export Format',
      formatMarkdown: 'Markdown',
      formatJson: 'JSON',
      formatHtml: 'HTML',
      formatAnimatedHtml: 'Animated HTML',
      formatText: 'Plain Text',
      formatMixed: 'Mixed (All Formats)',
      selectSessions: 'Select sessions ({selected}/{total})',
      all: 'All',
      none: 'None',
      noSessions: 'No sessions available',
      estimatedSize: 'Estimated size',
      cancel: 'Cancel',
      exporting: 'Exporting...',
      exportSessions: 'Export {count} sessions',
    };
    return translations[key] || key;
  },
}));

// Mock session store
const mockSessions = [
  {
    id: '1',
    title: 'Session 1',
    mode: 'chat',
    createdAt: new Date(),
  },
  {
    id: '2',
    title: 'Session 2',
    mode: 'agent',
    createdAt: new Date(Date.now() - 86400000),
  },
];

jest.mock('@/stores', () => ({
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      sessions: mockSessions,
    };
    return selector(state);
  },
}));

// Mock db repository
jest.mock('@/lib/db', () => ({
  messageRepository: {
    getBySessionId: jest.fn().mockResolvedValue([]),
  },
}));

// Mock export utilities
jest.mock('@/lib/export', () => ({
  exportSessionsToZip: jest
    .fn()
    .mockResolvedValue({ success: true, blob: new Blob(), filename: 'test.zip' }),
  downloadZip: jest.fn(),
  estimateExportSize: jest.fn().mockReturnValue(100),
}));

describe('BatchExportDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trigger button', async () => {
    await act(async () => {
      render(<BatchExportDialog />);
    });
    expect(screen.getByText('Batch Export')).toBeInTheDocument();
  });

  it('opens dialog on trigger click', async () => {
    await act(async () => {
      render(<BatchExportDialog />);
    });

    const triggerButton = screen.getByText('Batch Export');
    await act(async () => {
      fireEvent.click(triggerButton);
    });

    expect(screen.getByText('Export Sessions')).toBeInTheDocument();
  });

  it('displays dialog description', async () => {
    await act(async () => {
      render(<BatchExportDialog />);
    });

    const triggerButton = screen.getByText('Batch Export');
    await act(async () => {
      fireEvent.click(triggerButton);
    });

    expect(screen.getByText('Select sessions to export as a ZIP file')).toBeInTheDocument();
  });

  it('displays format selection', async () => {
    await act(async () => {
      render(<BatchExportDialog />);
    });

    const triggerButton = screen.getByText('Batch Export');
    await act(async () => {
      fireEvent.click(triggerButton);
    });

    expect(screen.getByText('Export Format')).toBeInTheDocument();
  });

  it('displays sessions list', async () => {
    await act(async () => {
      render(<BatchExportDialog />);
    });

    const triggerButton = screen.getByText('Batch Export');
    await act(async () => {
      fireEvent.click(triggerButton);
    });

    expect(screen.getByText('Session 1')).toBeInTheDocument();
    expect(screen.getByText('Session 2')).toBeInTheDocument();
  });

  it('has All and None selection buttons', async () => {
    await act(async () => {
      render(<BatchExportDialog />);
    });

    const triggerButton = screen.getByText('Batch Export');
    await act(async () => {
      fireEvent.click(triggerButton);
    });

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('has Cancel button', async () => {
    await act(async () => {
      render(<BatchExportDialog />);
    });

    const triggerButton = screen.getByText('Batch Export');
    await act(async () => {
      fireEvent.click(triggerButton);
    });

    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('accepts custom trigger', async () => {
    const customTrigger = <button data-testid="custom-trigger">Custom Export</button>;

    await act(async () => {
      render(<BatchExportDialog trigger={customTrigger} />);
    });

    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
  });
});

describe('BatchExportDialog - Session Selection', () => {
  it('displays session modes as badges', async () => {
    await act(async () => {
      render(<BatchExportDialog />);
    });

    const triggerButton = screen.getByText('Batch Export');
    await act(async () => {
      fireEvent.click(triggerButton);
    });

    expect(screen.getByText('chat')).toBeInTheDocument();
    expect(screen.getByText('agent')).toBeInTheDocument();
  });
});
