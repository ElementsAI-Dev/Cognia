/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportOptionsPanel } from './export-options-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores
jest.mock('@/stores/designer', () => ({
  useDesignerStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      code: '<div className="test">Hello</div>',
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) => (
    <button onClick={onClick} className={className} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <label className={className}>{children}</label>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <input
      type="checkbox"
      data-testid="switch"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange: _onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button className={className}>{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('ExportOptionsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the export options header', () => {
    render(<ExportOptionsPanel />);
    expect(screen.getByText('exportOptions')).toBeInTheDocument();
  });

  it('should render format selector', () => {
    render(<ExportOptionsPanel />);
    expect(screen.getByText('format')).toBeInTheDocument();
  });

  it('should render style selector', () => {
    render(<ExportOptionsPanel />);
    expect(screen.getByText('styleFormat')).toBeInTheDocument();
  });

  it('should render component name input', () => {
    render(<ExportOptionsPanel />);
    expect(screen.getByText('componentName')).toBeInTheDocument();
  });

  it('should render TypeScript toggle', () => {
    render(<ExportOptionsPanel />);
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('should render include comments toggle', () => {
    render(<ExportOptionsPanel />);
    expect(screen.getByText('includeComments')).toBeInTheDocument();
  });

  it('should render minify toggle', () => {
    render(<ExportOptionsPanel />);
    expect(screen.getByText('minify')).toBeInTheDocument();
  });

  it('should render copy button', () => {
    render(<ExportOptionsPanel />);
    expect(screen.getByText('copyToClipboard')).toBeInTheDocument();
  });

  it('should render download button', () => {
    render(<ExportOptionsPanel />);
    expect(screen.getByText('downloadFile')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<ExportOptionsPanel className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should call onExport when export button is clicked', async () => {
    const onExport = jest.fn();
    render(<ExportOptionsPanel onExport={onExport} />);
    
    const downloadButton = screen.getByText('downloadFile');
    await userEvent.click(downloadButton);
    
    expect(onExport).toHaveBeenCalled();
  });

  it('should copy code to clipboard when copy button is clicked', async () => {
    render(<ExportOptionsPanel />);
    
    const copyButton = screen.getByText('copyToClipboard');
    await userEvent.click(copyButton);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('should render options section', () => {
    render(<ExportOptionsPanel />);
    expect(screen.getByText('options')).toBeInTheDocument();
  });
});
