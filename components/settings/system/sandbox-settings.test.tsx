/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SandboxSettings } from './sandbox-settings';

// Mock useSandbox hook
const mockUseSandbox = {
  isAvailable: true,
  isLoading: false,
  config: {
    preferred_runtime: 'docker',
    default_timeout_secs: 30,
    default_memory_limit_mb: 256,
    default_cpu_limit_percent: 50,
    network_enabled: false,
    enabled_languages: ['python', 'javascript'],
  },
  runtimes: ['docker', 'podman'],
  languages: [
    { id: 'python', name: 'Python' },
    { id: 'javascript', name: 'JavaScript' },
  ],
  error: null,
  refreshStatus: jest.fn(),
  updateConfig: jest.fn(),
  setRuntime: jest.fn(),
  toggleLanguage: jest.fn(),
};

jest.mock('@/hooks/sandbox', () => ({
  useSandbox: () => mockUseSandbox,
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
    <button role="switch" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)} data-testid="switch">
      Switch
    </button>
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange }: { value?: number[]; onValueChange?: (v: number[]) => void }) => (
    <input
      type="range"
      data-testid="slider"
      value={value?.[0] || 0}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange: _onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>Select</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/types/sandbox', () => ({
  LANGUAGE_INFO: {
    python: { name: 'Python', icon: '🐍', color: '#3776AB' },
    javascript: { name: 'JavaScript', icon: '📜', color: '#F7DF1E' },
  },
}));

describe('SandboxSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<SandboxSettings />);
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays runtime selection with i18n', () => {
    render(<SandboxSettings />);
    // Runtime is translated via sandboxSettings.runtime - use getAllByText for multiple matches
    const runtimeElements = screen.getAllByText(/Runtime|runtime/i);
    expect(runtimeElements.length).toBeGreaterThan(0);
  });

  it('displays resource limits section with i18n', () => {
    render(<SandboxSettings />);
    const resourceElements = screen.getAllByText(/Resource Limits|resourceLimits/i);
    expect(resourceElements.length).toBeGreaterThan(0);
  });

  it('displays timeout setting with i18n', () => {
    render(<SandboxSettings />);
    const timeoutElements = screen.getAllByText(/Timeout|timeout/i);
    expect(timeoutElements.length).toBeGreaterThan(0);
  });

  it('displays memory limit setting with i18n', () => {
    render(<SandboxSettings />);
    const memoryElements = screen.getAllByText(/Memory Limit|memoryLimit/i);
    expect(memoryElements.length).toBeGreaterThan(0);
  });

  it('displays CPU limit setting with i18n', () => {
    render(<SandboxSettings />);
    const cpuElements = screen.getAllByText(/CPU Limit|cpuLimit/i);
    expect(cpuElements.length).toBeGreaterThan(0);
  });

  it('displays network access setting with i18n', () => {
    render(<SandboxSettings />);
    const networkElements = screen.getAllByText(/Network Access|networkAccess/i);
    expect(networkElements.length).toBeGreaterThan(0);
  });

  it('displays enabled languages section with i18n', () => {
    render(<SandboxSettings />);
    const languageElements = screen.getAllByText(/Enabled Languages|enabledLanguages/i);
    expect(languageElements.length).toBeGreaterThan(0);
  });

  it('renders sliders for resource settings', () => {
    render(<SandboxSettings />);
    const sliders = screen.getAllByTestId('slider');
    expect(sliders.length).toBeGreaterThanOrEqual(3);
  });

  it('renders switches for language toggles', () => {
    render(<SandboxSettings />);
    const switches = screen.getAllByTestId('switch');
    expect(switches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders save and refresh buttons with i18n', () => {
    render(<SandboxSettings />);
    const buttons = screen.getAllByTestId('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});
