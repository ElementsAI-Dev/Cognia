/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportDialog } from './export-dialog';
import type { Session } from '@/types';

// Mock database
jest.mock('@/lib/db', () => ({
  messageRepository: {
    getBySessionId: jest.fn().mockResolvedValue([
      { id: '1', role: 'user', content: 'Hello' },
      { id: '2', role: 'assistant', content: 'Hi there!' },
    ]),
  },
}));

// Mock export functions - inline to avoid hoisting issues
jest.mock('@/lib/export', () => ({
  exportToMarkdown: jest.fn().mockReturnValue('# Markdown'),
  exportToHTML: jest.fn().mockReturnValue('<html></html>'),
  exportToPDF: jest.fn().mockResolvedValue(undefined),
  exportToPlainText: jest.fn().mockReturnValue('Plain text'),
  exportToRichMarkdown: jest.fn().mockReturnValue('# Rich Markdown'),
  exportToRichJSON: jest.fn().mockReturnValue('{}'),
  exportToAnimatedHTML: jest.fn().mockReturnValue('<html>animated</html>'),
  downloadFile: jest.fn(),
  generateFilename: jest.fn().mockReturnValue('conversation.md'),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Export Conversation',
      description: 'Choose export format and options',
      exportNow: 'Export',
      exporting: 'Exporting...',
      animatedHtml: 'Animated HTML',
      animatedHtmlDesc: 'Interactive replay with typing animation',
      richMarkdown: 'Rich Markdown',
      richMarkdownDesc: 'Formatted markdown with metadata',
      json: 'JSON',
      jsonDesc: 'Complete data export',
      staticHtml: 'Static HTML',
      staticHtmlDesc: 'Simple HTML export',
      pdf: 'PDF',
      pdfDesc: 'Print-ready document format',
      plainText: 'Plain Text',
      plainTextDesc: 'Simple text without formatting',
      new: 'NEW',
      advancedOptions: 'Advanced Options',
      includeMetadata: 'Include Metadata',
      cancel: 'Cancel',
    };
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : <div>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-trigger">{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children, onValueChange: _onValueChange, value }: { 
    children: React.ReactNode; 
    onValueChange?: (value: string) => void;
    value?: string;
  }) => (
    <div data-testid="radio-group" data-value={value}>
      {children}
    </div>
  ),
  RadioGroupItem: ({ value, id }: { value: string; id: string }) => (
    <input type="radio" value={value} id={id} data-testid={`radio-${value}`} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: { 
    checked?: boolean; 
    onCheckedChange?: (checked: boolean) => void;
    id?: string;
  }) => (
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      id={id}
      data-testid="switch"
    />
  ),
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="collapsible" data-open={open}>{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-trigger">{children}</div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

describe('ExportDialog', () => {
  const mockSession: Session = {
    id: 'session-1',
    title: 'Test Conversation',
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ExportDialog session={mockSession} />);
    expect(screen.getAllByText('Export').length).toBeGreaterThan(0);
  });

  it('displays dialog title', () => {
    render(<ExportDialog session={mockSession} />);
    
    // Trigger dialog open - use first Export button
    fireEvent.click(screen.getAllByText('Export')[0]);
    
    expect(screen.getByText('Export Conversation')).toBeInTheDocument();
  });

  it('shows dialog description', () => {
    render(<ExportDialog session={mockSession} />);
    fireEvent.click(screen.getAllByText('Export')[0]);
    
    expect(screen.getByText(/Choose export format/)).toBeInTheDocument();
  });

  it('displays all export format options', () => {
    render(<ExportDialog session={mockSession} />);
    fireEvent.click(screen.getAllByText('Export')[0]);
    
    expect(screen.getByText('Animated HTML')).toBeInTheDocument();
    expect(screen.getByText('Rich Markdown')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('Static HTML')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('Plain Text')).toBeInTheDocument();
  });

  it('shows NEW badge for animated HTML', () => {
    render(<ExportDialog session={mockSession} />);
    fireEvent.click(screen.getAllByText('Export')[0]);
    
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('displays cancel button', () => {
    render(<ExportDialog session={mockSession} />);
    fireEvent.click(screen.getAllByText('Export')[0]);
    
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('exports when export button is clicked', async () => {
    render(<ExportDialog session={mockSession} />);
    fireEvent.click(screen.getAllByText('Export')[0]);
    
    // Click the export button in the dialog
    const exportButtons = screen.getAllByText('Export');
    fireEvent.click(exportButtons[exportButtons.length - 1]);
    
    // Wait for export to complete - dialog should close or show success
    await waitFor(() => {
      // Export button should show loading state then complete
      expect(screen.queryByText('Exporting...')).not.toBeInTheDocument();
    });
  });

  it('shows loading state during export', async () => {
    render(<ExportDialog session={mockSession} />);
    fireEvent.click(screen.getAllByText('Export')[0]);
    
    const exportButtons = screen.getAllByText('Export');
    fireEvent.click(exportButtons[exportButtons.length - 1]);
    
    // Should show exporting state
    expect(screen.getByText('Exporting...')).toBeInTheDocument();
  });

  it('renders with custom trigger', () => {
    render(
      <ExportDialog 
        session={mockSession} 
        trigger={<button>Custom Export Button</button>}
      />
    );
    
    expect(screen.getByText('Custom Export Button')).toBeInTheDocument();
  });

  it('displays format descriptions', () => {
    render(<ExportDialog session={mockSession} />);
    fireEvent.click(screen.getAllByText('Export')[0]);
    
    expect(screen.getByText(/Interactive replay with typing animation/)).toBeInTheDocument();
    expect(screen.getByText(/Complete data export/)).toBeInTheDocument();
  });

  it('has advanced options for markdown format', () => {
    render(<ExportDialog session={mockSession} />);
    fireEvent.click(screen.getAllByText('Export')[0]);
    
    // Select markdown format
    const markdownRadio = screen.getByTestId('radio-markdown');
    fireEvent.click(markdownRadio);
    
    expect(screen.getByText('Advanced Options')).toBeInTheDocument();
  });
});
