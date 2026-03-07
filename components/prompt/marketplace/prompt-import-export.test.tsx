/**
 * @jest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PromptImportExport } from './prompt-import-export';

const mockExportInstalledPrompts = jest.fn();
const mockImportPrompts = jest.fn();

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/stores/prompt/prompt-marketplace-store', () => ({
  usePromptMarketplaceStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      userActivity: {
        installed: [{ marketplaceId: 'prompt-1', installedAt: new Date() }],
      },
      exportInstalledPrompts: mockExportInstalledPrompts,
      importPrompts: mockImportPrompts,
    }),
}));

jest.mock('@/components/ui/sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    onOpenChange,
  }: {
    children: React.ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) => {
    React.useEffect(() => {
      onOpenChange?.(true);
    }, [onOpenChange]);

    return <div>{children}</div>;
  },
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
  }) => (
    <div>
      <button onClick={() => onValueChange?.('skip')}>set-skip</button>
      <button onClick={() => onValueChange?.('overwrite')}>set-overwrite</button>
      <button onClick={() => onValueChange?.('duplicate')}>set-duplicate</button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>value</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('PromptImportExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExportInstalledPrompts.mockReturnValue({
      version: '1.1',
      exportedAt: new Date().toISOString(),
      prompts: [
        {
          id: 'prompt-1',
          name: 'Prompt 1',
          content: 'Hello',
        },
      ],
    });
    mockImportPrompts.mockResolvedValue({
      success: true,
      imported: 1,
      skipped: 0,
      failed: 0,
      errors: [],
      items: [
        {
          sourcePromptId: 'prompt-1',
          targetPromptId: 'prompt-1',
          promptName: 'Prompt 1',
          status: 'imported',
          strategy: 'skip',
        },
      ],
    });
  });

  it('renders versioned export payload', async () => {
    render(<PromptImportExport />);

    await waitFor(() => {
      expect(screen.getByText(/"version":\s*"1.1"/)).toBeInTheDocument();
    });
  });

  it('calls import with selected conflict strategy', async () => {
    render(<PromptImportExport />);

    fireEvent.click(screen.getByText('set-overwrite'));
    fireEvent.change(screen.getByPlaceholderText('pasteJsonHere'), {
      target: { value: '{"version":"1.1","prompts":[]}' },
    });
    fireEvent.click(screen.getByText('importButton'));

    await waitFor(() => {
      expect(mockImportPrompts).toHaveBeenCalledWith(
        '{"version":"1.1","prompts":[]}',
        'overwrite'
      );
    });
  });

  it('renders import result summary including failed count', async () => {
    mockImportPrompts.mockResolvedValueOnce({
      success: false,
      imported: 1,
      skipped: 1,
      failed: 1,
      errors: ['bad payload'],
      items: [
        {
          sourcePromptId: 'prompt-1',
          targetPromptId: 'prompt-1',
          promptName: 'Prompt 1',
          status: 'failed',
          strategy: 'skip',
          message: 'bad payload',
        },
      ],
    });

    render(<PromptImportExport />);
    fireEvent.change(screen.getByPlaceholderText('pasteJsonHere'), {
      target: { value: '{"version":"1.1","prompts":[]}' },
    });
    fireEvent.click(screen.getByText('importButton'));

    await waitFor(() => {
      expect(screen.getByText(/failed:\s*1/i)).toBeInTheDocument();
      expect(screen.getByText(/bad payload/i)).toBeInTheDocument();
    });
  });
});
