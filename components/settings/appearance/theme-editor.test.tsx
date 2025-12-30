/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeEditor } from './theme-editor';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock react-colorful
jest.mock('react-colorful', () => ({
  HexColorPicker: ({ color, onChange }: { color: string; onChange: (c: string) => void }) => (
    <div data-testid="color-picker" data-color={color} onClick={() => onChange('#ff0000')}>ColorPicker</div>
  ),
  HexColorInput: ({ color, onChange }: { color: string; onChange: (c: string) => void }) => (
    <input data-testid="color-input" value={color} onChange={(e) => onChange(e.target.value)} />
  ),
}));

// Mock stores
const mockCreateCustomTheme = jest.fn().mockReturnValue('new-theme-id');
const mockUpdateCustomTheme = jest.fn();
const mockDeleteCustomTheme = jest.fn();
const mockSetActiveCustomTheme = jest.fn();

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      customThemes: [],
      createCustomTheme: mockCreateCustomTheme,
      updateCustomTheme: mockUpdateCustomTheme,
      deleteCustomTheme: mockDeleteCustomTheme,
      setActiveCustomTheme: mockSetActiveCustomTheme,
    };
    return selector(state);
  },
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, id }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input value={value} onChange={onChange} placeholder={placeholder} id={id} data-testid={id || 'input'} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <button role="switch" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)} data-testid="switch">Switch</button>
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

describe('ThemeEditor', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    editingThemeId: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<ThemeEditor {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ThemeEditor {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays create theme title when not editing', () => {
    render(<ThemeEditor {...defaultProps} />);
    expect(screen.getByText('createTheme')).toBeInTheDocument();
  });

  it('displays theme name input', () => {
    render(<ThemeEditor {...defaultProps} />);
    expect(screen.getByText('themeName')).toBeInTheDocument();
  });

  it('displays dark theme toggle', () => {
    render(<ThemeEditor {...defaultProps} />);
    expect(screen.getByText('darkTheme')).toBeInTheDocument();
  });

  it('displays colors section', () => {
    render(<ThemeEditor {...defaultProps} />);
    expect(screen.getByText('colors')).toBeInTheDocument();
  });

  it('displays preview section', () => {
    render(<ThemeEditor {...defaultProps} />);
    expect(screen.getByText('preview')).toBeInTheDocument();
  });

  it('displays color picker', () => {
    render(<ThemeEditor {...defaultProps} />);
    expect(screen.getByTestId('color-picker')).toBeInTheDocument();
  });

  it('displays save button', () => {
    render(<ThemeEditor {...defaultProps} />);
    expect(screen.getByText('save')).toBeInTheDocument();
  });

  it('displays cancel button', () => {
    render(<ThemeEditor {...defaultProps} />);
    expect(screen.getByText('cancel')).toBeInTheDocument();
  });

  it('calls onOpenChange when cancel is clicked', () => {
    render(<ThemeEditor {...defaultProps} />);
    fireEvent.click(screen.getByText('cancel'));
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });
});
