/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolSettings } from './tool-settings';

// Mock stores
const mockSetEnableFileTools = jest.fn();
const mockSetEnableDocumentTools = jest.fn();
const mockSetEnableCodeExecution = jest.fn();
const mockSetEnableWebSearch = jest.fn();
const mockSetEnableRAGSearch = jest.fn();
const mockSetEnableCalculator = jest.fn();

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      enableFileTools: false,
      setEnableFileTools: mockSetEnableFileTools,
      enableDocumentTools: true,
      setEnableDocumentTools: mockSetEnableDocumentTools,
      enableCodeExecution: false,
      setEnableCodeExecution: mockSetEnableCodeExecution,
      enableWebSearch: true,
      setEnableWebSearch: mockSetEnableWebSearch,
      enableRAGSearch: false,
      setEnableRAGSearch: mockSetEnableRAGSearch,
      enableCalculator: true,
      setEnableCalculator: mockSetEnableCalculator,
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

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <button role="switch" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)} data-testid="switch">Switch</button>
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h4>{children}</h4>,
}));

describe('ToolSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ToolSettings />);
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays Tool Permissions alert', () => {
    render(<ToolSettings />);
    expect(screen.getByText('Tool Permissions')).toBeInTheDocument();
  });

  it('displays File Operations category', () => {
    render(<ToolSettings />);
    expect(screen.getByText('File Operations')).toBeInTheDocument();
  });

  it('displays Document Processing category', () => {
    render(<ToolSettings />);
    expect(screen.getByText('Document Processing')).toBeInTheDocument();
  });

  it('displays Web Search category', () => {
    render(<ToolSettings />);
    expect(screen.getByText('Web Search')).toBeInTheDocument();
  });

  it('displays Knowledge Base Search category', () => {
    render(<ToolSettings />);
    expect(screen.getByText('Knowledge Base Search')).toBeInTheDocument();
  });

  it('displays Calculator category', () => {
    render(<ToolSettings />);
    expect(screen.getByText('Calculator')).toBeInTheDocument();
  });

  it('displays Code Execution category', () => {
    render(<ToolSettings />);
    expect(screen.getByText('Code Execution')).toBeInTheDocument();
  });

  it('renders switches for each category', () => {
    render(<ToolSettings />);
    const switches = screen.getAllByTestId('switch');
    expect(switches.length).toBe(6);
  });

  it('toggles file tools', () => {
    render(<ToolSettings />);
    const switches = screen.getAllByTestId('switch');
    fireEvent.click(switches[0]);
    expect(mockSetEnableFileTools).toHaveBeenCalledWith(true);
  });
});
