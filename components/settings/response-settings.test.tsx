/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResponseSettings } from './response-settings';

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
    expect(screen.getByText('Code Display')).toBeInTheDocument();
  });

  it('displays Text Display section', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('Text Display')).toBeInTheDocument();
  });

  it('displays Layout Options section', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('Layout Options')).toBeInTheDocument();
  });

  it('displays Preview section', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('displays Theme selector', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('Theme')).toBeInTheDocument();
  });

  it('displays Font selector', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('Font')).toBeInTheDocument();
  });

  it('displays Line Numbers switch', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('Line Numbers')).toBeInTheDocument();
  });

  it('displays Syntax Highlight switch', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('Syntax Highlight')).toBeInTheDocument();
  });

  it('displays LaTeX switch', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('LaTeX')).toBeInTheDocument();
  });

  it('displays Mermaid switch', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('Mermaid')).toBeInTheDocument();
  });

  it('displays Compact switch', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('Compact')).toBeInTheDocument();
  });

  it('displays Timestamps switch', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('Timestamps')).toBeInTheDocument();
  });

  it('displays Tokens switch', () => {
    render(<ResponseSettings />);
    expect(screen.getByText('Tokens')).toBeInTheDocument();
  });
});
