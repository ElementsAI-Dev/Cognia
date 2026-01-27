/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PromptImportExport } from './prompt-import-export';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock URL API
global.URL.createObjectURL = jest.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = jest.fn();

// Mock store
const mockInstallPrompt = jest.fn().mockResolvedValue(undefined);
const mockGetPromptById = jest.fn().mockImplementation((id: string) => {
  if (id === 'prompt-1') {
    return {
      id: 'prompt-1',
      name: 'Test Prompt',
      description: 'A test prompt',
      content: 'Test content',
      category: 'writing',
      tags: ['test'],
      variables: [],
      author: { id: 'user-1', name: 'Test Author' },
    };
  }
  return null;
});

jest.mock('@/stores/prompt/prompt-marketplace-store', () => ({
  usePromptMarketplaceStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      userActivity: {
        installed: [
          { marketplaceId: 'prompt-1', installedAt: new Date() },
        ],
      },
      getPromptById: mockGetPromptById,
      installPrompt: mockInstallPrompt,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => 
    asChild ? <>{children}</> : <button>{children}</button>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange: _onValueChange }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void }) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value, onClick }: { children: React.ReactNode; value: string; onClick?: () => void }) => (
    <button role="tab" data-value={value} onClick={onClick}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder }: { value?: string; onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder?: string }) => (
    <textarea 
      data-testid="import-textarea" 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder}
    />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('PromptImportExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trigger button', () => {
    render(<PromptImportExport />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders with default trigger text', () => {
    render(<PromptImportExport />);
    // The trigger button shows the title translation key
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('accepts custom trigger element', () => {
    render(
      <PromptImportExport 
        trigger={<button data-testid="custom-trigger">Custom Trigger</button>} 
      />
    );
    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
  });

  it('renders export tab content', () => {
    render(<PromptImportExport />);
    expect(screen.getByTestId('tab-content-export')).toBeInTheDocument();
  });

  it('renders import tab content', () => {
    render(<PromptImportExport />);
    expect(screen.getByTestId('tab-content-import')).toBeInTheDocument();
  });

  it('renders tabs for export and import', () => {
    render(<PromptImportExport />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(2);
  });

  it('renders export description with prompt count', () => {
    render(<PromptImportExport />);
    // Should show export description with actual text
    expect(screen.getByText(/Exporting.*prompts/i)).toBeInTheDocument();
  });

  it('renders copy button in export tab', () => {
    render(<PromptImportExport />);
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('renders download button in export tab', () => {
    render(<PromptImportExport />);
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('renders file select button in import tab', () => {
    render(<PromptImportExport />);
    expect(screen.getByText('Select File')).toBeInTheDocument();
  });

  it('renders import textarea', () => {
    render(<PromptImportExport />);
    expect(screen.getByTestId('import-textarea')).toBeInTheDocument();
  });

  it('renders import button', () => {
    render(<PromptImportExport />);
    expect(screen.getByText('Import Prompts')).toBeInTheDocument();
  });

  it('disables import button when textarea is empty', () => {
    render(<PromptImportExport />);
    const importButton = screen.getByText('Import Prompts');
    expect(importButton).toBeDisabled();
  });

  it('enables import button when textarea has content', () => {
    render(<PromptImportExport />);
    const textarea = screen.getByTestId('import-textarea');
    fireEvent.change(textarea, { target: { value: '{"prompts": []}' } });
    const importButton = screen.getByText('Import Prompts');
    expect(importButton).not.toBeDisabled();
  });

  it('renders export data as JSON', () => {
    render(<PromptImportExport />);
    // Export data should include the JSON content
    expect(screen.getByText(/"version": "1.0"/)).toBeInTheDocument();
  });

  it('handles copy to clipboard', async () => {
    render(<PromptImportExport />);
    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });
});
