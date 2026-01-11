/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProxySettings } from './proxy-settings';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock useProxy hook
const mockSetMode = jest.fn();
const mockSetEnabled = jest.fn();
const mockSetManualConfig = jest.fn();
const mockSelectProxy = jest.fn();
const mockDetectProxies = jest.fn();
const mockTestCurrentProxy = jest.fn();
const mockClearError = jest.fn();

let mockIsAvailable = true;
let mockMode = 'off';
let mockEnabled = false;
let mockConnected = false;
let mockDetectedProxies: Array<{ software: string; running: boolean; mixedPort?: number; version?: string }> = [];

jest.mock('@/hooks/network', () => ({
  useProxy: () => ({
    mode: mockMode,
    enabled: mockEnabled,
    manualConfig: { protocol: 'http', host: '127.0.0.1', port: 7890 },
    selectedProxy: null,
    detectedProxies: mockDetectedProxies,
    isDetecting: false,
    isTesting: false,
    connected: mockConnected,
    currentProxy: mockEnabled ? 'http://127.0.0.1:7890' : null,
    lastTestLatency: mockConnected ? 50 : null,
    error: null,
    isAvailable: mockIsAvailable,
    setMode: mockSetMode,
    setEnabled: mockSetEnabled,
    setManualConfig: mockSetManualConfig,
    selectProxy: mockSelectProxy,
    detectProxies: mockDetectProxies,
    testCurrentProxy: mockTestCurrentProxy,
    clearError: mockClearError,
  }),
}));

// Mock proxy types
jest.mock('@/types/system/proxy', () => ({
  PROXY_SOFTWARE_INFO: {
    clash: { name: 'Clash', icon: '⚔️' },
    v2ray: { name: 'V2Ray', icon: '🚀' },
    shadowsocks: { name: 'Shadowsocks', icon: '🔒' },
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

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} data-testid="input" />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      data-testid="switch"
    >
      Switch
    </button>
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>Value</span>,
}));

jest.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children, value, onValueChange: _onValueChange }: { children: React.ReactNode; value: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="radio-group" data-value={value}>{children}</div>
  ),
  RadioGroupItem: ({ value }: { value: string }) => (
    <input type="radio" value={value} data-testid={`radio-${value}`} />
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

describe('ProxySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailable = true;
    mockMode = 'off';
    mockEnabled = false;
    mockConnected = false;
    mockDetectedProxies = [];
  });

  it('renders without crashing', () => {
    render(<ProxySettings />);
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('displays description', () => {
    render(<ProxySettings />);
    expect(screen.getByText('description')).toBeInTheDocument();
  });

  it('shows enable proxy switch', () => {
    render(<ProxySettings />);
    expect(screen.getByText('enableProxy')).toBeInTheDocument();
    expect(screen.getByTestId('switch')).toBeInTheDocument();
  });

  it('toggles proxy enabled state', () => {
    render(<ProxySettings />);
    const switchBtn = screen.getByTestId('switch');
    fireEvent.click(switchBtn);
    expect(mockSetEnabled).toHaveBeenCalledWith(true);
  });

  it('displays proxy mode section', () => {
    render(<ProxySettings />);
    expect(screen.getByText('proxyMode')).toBeInTheDocument();
  });

  it('shows all mode options', () => {
    render(<ProxySettings />);
    expect(screen.getByText('modeOff')).toBeInTheDocument();
    expect(screen.getByText('modeAuto')).toBeInTheDocument();
    expect(screen.getByText('modeManual')).toBeInTheDocument();
    expect(screen.getByText('modeSystem')).toBeInTheDocument();
  });

  it('displays radio group for mode selection', () => {
    render(<ProxySettings />);
    expect(screen.getByTestId('radio-group')).toBeInTheDocument();
  });

  it('shows disconnected badge when not connected', () => {
    render(<ProxySettings />);
    expect(screen.getByText('disconnected')).toBeInTheDocument();
  });

  it('shows test proxy section', () => {
    render(<ProxySettings />);
    expect(screen.getByText('testProxy')).toBeInTheDocument();
    expect(screen.getByText('testConnection')).toBeInTheDocument();
  });

  it('disables test button when mode is off', () => {
    render(<ProxySettings />);
    const testButton = screen.getByText('testConnection').closest('button');
    expect(testButton).toBeDisabled();
  });
});

describe('ProxySettings not available', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailable = false;
  });

  it('shows not available message when proxy is not available', () => {
    render(<ProxySettings />);
    expect(screen.getByText('notAvailable')).toBeInTheDocument();
  });

  it('displays not available description', () => {
    render(<ProxySettings />);
    expect(screen.getByText('notAvailableDesc')).toBeInTheDocument();
  });
});

describe('ProxySettings connected state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailable = true;
    mockMode = 'manual';
    mockEnabled = true;
    mockConnected = true;
  });

  it('shows connected badge when connected', () => {
    render(<ProxySettings />);
    expect(screen.getByText('connected (50ms)')).toBeInTheDocument();
  });

  it('shows current proxy address', () => {
    render(<ProxySettings />);
    expect(screen.getByText('http://127.0.0.1:7890')).toBeInTheDocument();
  });
});

describe('ProxySettings auto mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailable = true;
    mockMode = 'auto';
    mockEnabled = true;
    mockDetectedProxies = [
      { software: 'clash', running: true, mixedPort: 7890, version: '1.0.0' },
    ];
  });

  it('shows detected proxies section in auto mode', () => {
    render(<ProxySettings />);
    expect(screen.getByText('detectedProxies')).toBeInTheDocument();
  });

  it('shows detect button', () => {
    render(<ProxySettings />);
    expect(screen.getByText('detect')).toBeInTheDocument();
  });

  it('calls detectProxies when detect button clicked', () => {
    render(<ProxySettings />);
    const detectButton = screen.getByText('detect');
    fireEvent.click(detectButton);
    expect(mockDetectProxies).toHaveBeenCalled();
  });
});

describe('ProxySettings manual mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailable = true;
    mockMode = 'manual';
    mockEnabled = true;
  });

  it('shows manual config section in manual mode', () => {
    render(<ProxySettings />);
    expect(screen.getByText('manualConfig')).toBeInTheDocument();
  });

  it('shows protocol select', () => {
    render(<ProxySettings />);
    expect(screen.getByText('protocol')).toBeInTheDocument();
  });

  it('shows port input', () => {
    render(<ProxySettings />);
    expect(screen.getByText('port')).toBeInTheDocument();
  });

  it('shows host input', () => {
    render(<ProxySettings />);
    expect(screen.getByText('host')).toBeInTheDocument();
  });

  it('shows save button', () => {
    render(<ProxySettings />);
    expect(screen.getByText('save')).toBeInTheDocument();
  });
});
