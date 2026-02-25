/**
 * Unit tests for LatexSettingsDialog component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LatexSettingsDialog } from './settings-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
}));

// Mock store
const mockUpdateSettings = jest.fn();
const mockResetSettings = jest.fn();
const mockSettings = {
  theme: 'system' as const,
  fontSize: 14,
  fontFamily: 'JetBrains Mono, Fira Code, monospace',
  lineNumbers: true,
  wordWrap: true,
  spellCheck: false,
  tabSize: 2,
  autoSave: true,
  autoSaveIntervalMs: 30000,
  previewEnabled: true,
  splitMode: 'vertical' as const,
  mathRenderer: 'katex' as const,
};

jest.mock('@/stores/latex', () => ({
  useLatexStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      settings: mockSettings,
      updateSettings: mockUpdateSettings,
      resetSettings: mockResetSettings,
    }),
  LaTeXEditorSettings: {},
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog">{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-trigger">{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange }: { value: number[]; onValueChange: (v: number[]) => void }) => (
    <input
      data-testid="font-size-slider"
      type="range"
      value={value[0]}
      onChange={(e) => onValueChange([Number(e.target.value)])}
    />
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
    >
      {checked ? 'on' : 'off'}
    </button>
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value }: { children: React.ReactNode; onValueChange?: (v: string) => void; value: string }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>value</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <label className={className}>{children}</label>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void; [key: string]: unknown }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('lucide-react', () => ({
  Settings: () => <span data-testid="settings-icon" />,
}));

describe('LatexSettingsDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default trigger', () => {
    render(<LatexSettingsDialog />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
  });

  it('renders with custom trigger', () => {
    render(<LatexSettingsDialog trigger={<button>Custom Trigger</button>} />);
    expect(screen.getByText('Custom Trigger')).toBeInTheDocument();
  });

  it('displays dialog title and description', () => {
    render(<LatexSettingsDialog />);
    expect(screen.getByText('Editor Settings')).toBeInTheDocument();
    expect(screen.getByText('Customize your LaTeX editing experience')).toBeInTheDocument();
  });

  it('displays font size control', () => {
    render(<LatexSettingsDialog />);
    expect(screen.getByText('Font Size')).toBeInTheDocument();
    expect(screen.getByText('14px')).toBeInTheDocument();
    expect(screen.getByTestId('font-size-slider')).toBeInTheDocument();
  });

  it('displays font family control', () => {
    render(<LatexSettingsDialog />);
    expect(screen.getByText('Font Family')).toBeInTheDocument();
  });

  it('displays theme control', () => {
    render(<LatexSettingsDialog />);
    expect(screen.getByText('Theme')).toBeInTheDocument();
  });

  it('displays toggle controls', () => {
    render(<LatexSettingsDialog />);
    expect(screen.getByText('Line Numbers')).toBeInTheDocument();
    expect(screen.getByText('Word Wrap')).toBeInTheDocument();
    expect(screen.getByText('Spell Check')).toBeInTheDocument();
  });

  it('displays auto-save controls', () => {
    render(<LatexSettingsDialog />);
    expect(screen.getByText('Auto Save')).toBeInTheDocument();
    expect(screen.getByText('Save Interval')).toBeInTheDocument();
  });

  it('displays tab size control', () => {
    render(<LatexSettingsDialog />);
    expect(screen.getByText('Tab Size')).toBeInTheDocument();
  });

  it('calls resetSettings when reset button clicked', async () => {
    render(<LatexSettingsDialog />);
    const resetBtn = screen.getByText('Reset to Defaults');
    await userEvent.click(resetBtn);
    expect(mockResetSettings).toHaveBeenCalled();
  });

  it('calls updateSettings when line numbers toggled', async () => {
    render(<LatexSettingsDialog />);
    const switches = screen.getAllByRole('switch');
    // First switch is Line Numbers
    await userEvent.click(switches[0]);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ lineNumbers: false });
  });

  it('calls updateSettings when word wrap toggled', async () => {
    render(<LatexSettingsDialog />);
    const switches = screen.getAllByRole('switch');
    // Second switch is Word Wrap
    await userEvent.click(switches[1]);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ wordWrap: false });
  });

  it('calls updateSettings when spell check toggled', async () => {
    render(<LatexSettingsDialog />);
    const switches = screen.getAllByRole('switch');
    // Third switch is Spell Check (off by default)
    await userEvent.click(switches[2]);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ spellCheck: true });
  });

  it('calls updateSettings when auto-save toggled', async () => {
    render(<LatexSettingsDialog />);
    const switches = screen.getAllByRole('switch');
    // Fourth switch is Auto Save
    await userEvent.click(switches[3]);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ autoSave: false });
  });
});
