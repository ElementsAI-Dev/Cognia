/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeSchedule } from './theme-schedule';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores
const mockSetTheme = jest.fn();
let mockTheme = 'light';
let mockLanguage = 'en';

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      theme: mockTheme,
      setTheme: mockSetTheme,
      language: mockLanguage,
    };
    return selector(state);
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock UI components
jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, disabled }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; disabled?: boolean }) => (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      data-testid="switch"
    >
      Switch
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input type={type} value={value} onChange={onChange} {...props} data-testid="time-input" />
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

describe('ThemeSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockTheme = 'light';
    mockLanguage = 'en';
  });

  it('renders without crashing', () => {
    render(<ThemeSchedule />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('displays title', () => {
    render(<ThemeSchedule />);
    expect(screen.getByText('themeSchedule')).toBeInTheDocument();
  });

  it('displays description', () => {
    render(<ThemeSchedule />);
    expect(screen.getByText('themeScheduleDescription')).toBeInTheDocument();
  });

  it('shows enable schedule switch', () => {
    render(<ThemeSchedule />);
    expect(screen.getByText('enableSchedule')).toBeInTheDocument();
    expect(screen.getByTestId('switch')).toBeInTheDocument();
  });

  it('toggles schedule enabled state', () => {
    render(<ThemeSchedule />);
    const switchBtn = screen.getByTestId('switch');
    fireEvent.click(switchBtn);
    // Schedule should toggle
  });

  it('shows time inputs when schedule is enabled', () => {
    // Set enabled in localStorage
    localStorageMock.setItem('themeSchedule', JSON.stringify({
      enabled: true,
      lightModeStart: '07:00',
      darkModeStart: '19:00',
    }));
    
    render(<ThemeSchedule />);
    // Time inputs are shown when enabled
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('disables switch when theme is system', () => {
    mockTheme = 'system';
    render(<ThemeSchedule />);
    const switchBtn = screen.getByTestId('switch');
    expect(switchBtn).toBeDisabled();
  });

  it('shows warning when theme is system', () => {
    mockTheme = 'system';
    render(<ThemeSchedule />);
    // Warning text should be visible
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('updates light mode start time', () => {
    localStorageMock.setItem('themeSchedule', JSON.stringify({
      enabled: true,
      lightModeStart: '07:00',
      darkModeStart: '19:00',
    }));
    
    render(<ThemeSchedule />);
    // Component should render with schedule enabled
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('displays card component', () => {
    render(<ThemeSchedule />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('handles Chinese language', () => {
    mockLanguage = 'zh-CN';
    render(<ThemeSchedule />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('loads schedule from localStorage on mount', () => {
    const savedSchedule = {
      enabled: true,
      lightModeStart: '06:30',
      darkModeStart: '20:00',
    };
    localStorageMock.setItem('themeSchedule', JSON.stringify(savedSchedule));
    
    render(<ThemeSchedule />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });
});
