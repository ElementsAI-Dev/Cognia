/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResponseSettings } from './response-settings';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Response Settings',
      description: 'Configure how responses are displayed',
      codeTheme: 'Code Theme',
      codeFontFamily: 'Code Font',
      codeFontSize: 'Font Size',
      lineHeight: 'Line Height',
      showLineNumbers: 'Show Line Numbers',
      enableSyntaxHighlight: 'Syntax Highlighting',
      enableMathRendering: 'Math Rendering',
      enableMermaidDiagrams: 'Mermaid Diagrams',
      compactMode: 'Compact Mode',
      showTimestamps: 'Show Timestamps',
      showTokenCount: 'Show Token Count',
    };
    return translations[key] || key;
  },
}));

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      codeTheme: 'github-dark',
      setCodeTheme: jest.fn(),
      codeFontFamily: 'system',
      setCodeFontFamily: jest.fn(),
      codeFontSize: 14,
      setCodeFontSize: jest.fn(),
      lineHeight: 1.5,
      setLineHeight: jest.fn(),
      showLineNumbers: true,
      setShowLineNumbers: jest.fn(),
      enableSyntaxHighlight: true,
      setEnableSyntaxHighlight: jest.fn(),
      enableMathRendering: false,
      setEnableMathRendering: jest.fn(),
      enableMermaidDiagrams: false,
      setEnableMermaidDiagrams: jest.fn(),
      compactMode: false,
      setCompactMode: jest.fn(),
      showTimestamps: true,
      setShowTimestamps: jest.fn(),
      showTokenCount: false,
      setShowTokenCount: jest.fn(),
      mathFontScale: 1.0,
      setMathFontScale: jest.fn(),
      mathDisplayAlignment: 'center',
      setMathDisplayAlignment: jest.fn(),
      mathShowCopyButton: false,
      setMathShowCopyButton: jest.fn(),
      enableVegaLiteCharts: false,
      setEnableVegaLiteCharts: jest.fn(),
      mermaidTheme: 'default',
      setMermaidTheme: jest.fn(),
      vegaLiteTheme: 'default',
      setVegaLiteTheme: jest.fn(),
      codeWordWrap: false,
      setCodeWordWrap: jest.fn(),
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; id?: string }) => (
    <button role="switch" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)} data-testid={id || 'switch'}>Switch</button>
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange }: { value?: number[]; onValueChange?: (v: number[]) => void }) => (
    <input type="range" data-testid="slider" value={value?.[0]} onChange={(e) => onValueChange?.([Number(e.target.value)])} />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value }: { children: React.ReactNode; value?: string }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: () => <span>Value</span>,
}));

describe('ResponseSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ResponseSettings />);
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays Code Display section', () => {
    render(<ResponseSettings />);
    // Component renders translation keys
    expect(screen.getByText('codeDisplay')).toBeInTheDocument();
  });

  it('displays Text Display section', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('textDisplay')).toBeInTheDocument();
  });

  it('displays Layout Options section', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('layoutOptions')).toBeInTheDocument();
  });

  it('displays Preview section', () => {
    render(<ResponseSettings />);
    // Preview card has translation key 'preview'
    expect(screen.getByText('preview')).toBeInTheDocument();
  });

  it('displays Theme selector', () => {
    render(<ResponseSettings />);
    // Component renders translation keys
    expect(screen.getByText('theme')).toBeInTheDocument();
  });

  it('displays Font selector', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('font')).toBeInTheDocument();
  });

  it('displays Line Numbers switch', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('lineNumbers')).toBeInTheDocument();
  });

  it('displays Syntax Highlight switch', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('syntaxHighlight')).toBeInTheDocument();
  });

  it('displays LaTeX switch', () => {
    render(<ResponseSettings />);
    // Component uses hardcoded label
    expect(screen.getByText('LaTeX')).toBeInTheDocument();
  });

  it('displays Mermaid switch', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('Mermaid')).toBeInTheDocument();
  });

  it('displays Compact switch', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('compact')).toBeInTheDocument();
  });

  it('displays Timestamps switch', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('timestamps')).toBeInTheDocument();
  });

  it('displays Tokens switch', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('tokens')).toBeInTheDocument();
  });
});
