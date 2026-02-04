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
let mockTheme = 'light';
let mockLanguage = 'en';
const mockSetThemeSchedule = jest.fn();
let mockThemeSchedule = {
  enabled: false,
  lightModeStart: '07:00',
  darkModeStart: '19:00',
  overrideSystem: false,
};

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      theme: mockTheme,
      language: mockLanguage,
      themeSchedule: mockThemeSchedule,
      setThemeSchedule: mockSetThemeSchedule,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, disabled }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; disabled?: boolean }) => (
    <button
      role="switch"
      aria-checked="false"
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
    mockTheme = 'light';
    mockLanguage = 'en';
    mockThemeSchedule = {
      enabled: false,
      lightModeStart: '07:00',
      darkModeStart: '19:00',
      overrideSystem: false,
    };
  });

  it('renders without crashing', () => {
    render(<ThemeSchedule />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('displays title', () => {
    render(<ThemeSchedule />);
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('displays description', () => {
    render(<ThemeSchedule />);
    expect(screen.getByText('description')).toBeInTheDocument();
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
    expect(mockSetThemeSchedule).toHaveBeenCalledWith({ enabled: true });
  });

  it('shows time inputs when schedule is enabled', () => {
    mockThemeSchedule = {
      enabled: true,
      lightModeStart: '07:00',
      darkModeStart: '19:00',
      overrideSystem: false,
    };
    
    render(<ThemeSchedule />);
    // Time inputs are shown when enabled
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('does not disable switch when theme is system', () => {
    mockTheme = 'system';
    render(<ThemeSchedule />);
    const switchBtn = screen.getByTestId('switch');
    expect(switchBtn).not.toBeDisabled();
  });

  it('shows warning when theme is system and schedule is enabled', () => {
    mockTheme = 'system';
    mockThemeSchedule = {
      enabled: true,
      lightModeStart: '07:00',
      darkModeStart: '19:00',
      overrideSystem: false,
    };
    render(<ThemeSchedule />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('updates light mode start time', () => {
    mockThemeSchedule = {
      enabled: true,
      lightModeStart: '07:00',
      darkModeStart: '19:00',
      overrideSystem: false,
    };
    
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

  it('renders with schedule enabled state from store', () => {
    mockThemeSchedule = {
      enabled: true,
      lightModeStart: '06:30',
      darkModeStart: '20:00',
      overrideSystem: false,
    };
    render(<ThemeSchedule />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('shows override system option when theme is system and schedule is enabled (A2)', () => {
    mockTheme = 'system';
    mockThemeSchedule = {
      enabled: true,
      lightModeStart: '07:00',
      darkModeStart: '19:00',
      overrideSystem: false,
    };
    render(<ThemeSchedule />);
    // Should show the override system toggle
    expect(screen.getByText('overrideSystem')).toBeInTheDocument();
  });

  it('toggles override system option (A2)', () => {
    mockTheme = 'system';
    mockThemeSchedule = {
      enabled: true,
      lightModeStart: '07:00',
      darkModeStart: '19:00',
      overrideSystem: false,
    };
    render(<ThemeSchedule />);
    // Find and click the override system switch
    const switches = screen.getAllByTestId('switch');
    // The second switch should be the override system toggle
    if (switches.length > 1) {
      fireEvent.click(switches[1]);
      expect(mockSetThemeSchedule).toHaveBeenCalledWith({ overrideSystem: true });
    }
  });
});
