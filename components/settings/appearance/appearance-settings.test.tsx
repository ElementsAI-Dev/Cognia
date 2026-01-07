/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppearanceSettings } from './appearance-settings';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Moon: () => <span>Moon</span>,
  Sun: () => <span>Sun</span>,
  Monitor: () => <span>Monitor</span>,
  Check: () => <span>Check</span>,
  Palette: () => <span>Palette</span>,
  Globe: () => <span>Globe</span>,
  Plus: () => <span>Plus</span>,
  Type: () => <span>Type</span>,
  MessageCircle: () => <span>MessageCircle</span>,
  Settings2: () => <span>Settings2</span>,
  MapPin: () => <span>MapPin</span>,
  RefreshCw: () => <span>RefreshCw</span>,
  Power: () => <span>Power</span>,
}));

// Mock useAutostart hook
jest.mock('@/hooks/native', () => ({
  useAutostart: () => ({
    autostart: false,
    setAutostart: jest.fn(),
    isLoading: false,
    isSupported: false,
  }),
}));

// Mock stores
const mockSetTheme = jest.fn();
const mockSetColorTheme = jest.fn();
const mockSetLanguage = jest.fn();
const mockSetSidebarCollapsed = jest.fn();
const mockSetSendOnEnter = jest.fn();
const mockSetStreamResponses = jest.fn();
const mockSetActiveCustomTheme = jest.fn();

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      theme: 'light',
      setTheme: mockSetTheme,
      colorTheme: 'default',
      setColorTheme: mockSetColorTheme,
      customThemes: [],
      activeCustomThemeId: null,
      setActiveCustomTheme: mockSetActiveCustomTheme,
      language: 'en',
      setLanguage: mockSetLanguage,
      sidebarCollapsed: false,
      setSidebarCollapsed: mockSetSidebarCollapsed,
      sendOnEnter: true,
      setSendOnEnter: mockSetSendOnEnter,
      streamResponses: true,
      setStreamResponses: mockSetStreamResponses,
      uiFontSize: 14,
      setUIFontSize: jest.fn(),
      messageBubbleStyle: 'modern',
      setMessageBubbleStyle: jest.fn(),
      uiCustomization: {
        borderRadius: 'md',
        spacing: 'comfortable',
        shadowIntensity: 'subtle',
        enableAnimations: true,
        enableBlur: true,
        sidebarWidth: 280,
        chatMaxWidth: 800,
      },
      setBorderRadius: jest.fn(),
      setSpacing: jest.fn(),
      setShadowIntensity: jest.fn(),
      setEnableAnimations: jest.fn(),
      setEnableBlur: jest.fn(),
      setSidebarWidth: jest.fn(),
      setChatMaxWidth: jest.fn(),
      resetUICustomization: jest.fn(),
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      onClick={() => onCheckedChange?.(!checked)}
    >
      Switch
    </button>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={type ?? 'button'} onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange }: { value?: number[]; onValueChange?: (v: number[]) => void }) => (
    <input
      type="range"
      data-testid="slider"
      value={value?.[0] || 0}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      aria-label="slider"
      title="slider"
    />
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange: _onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>Value</span>,
}));

jest.mock('@/lib/themes', () => ({
  THEME_PRESETS: {
    default: { name: 'Default', colors: {} },
    ocean: { name: 'Ocean', colors: {} },
    forest: { name: 'Forest', colors: {} },
    sunset: { name: 'Sunset', colors: {} },
    lavender: { name: 'Lavender', colors: {} },
    rose: { name: 'Rose', colors: {} },
  },
  applyUICustomization: jest.fn(),
}));

jest.mock('@/lib/i18n', () => ({
  localeNames: { en: 'English', zh: '中文' },
  localeFlags: { en: '🇺🇸', zh: '🇨🇳' },
}));

jest.mock('./theme-editor', () => ({
  ThemeEditor: () => <div data-testid="theme-editor" />,
}));

jest.mock('./theme-schedule', () => ({
  ThemeSchedule: () => <div data-testid="theme-schedule" />,
}));

jest.mock('./ui-customization-settings', () => ({
  UICustomizationSettings: () => <div data-testid="ui-customization-settings" />,
}));

jest.mock('./background-settings', () => ({
  BackgroundSettings: () => <div data-testid="background-settings" />,
}));

jest.mock('./theme-import-export', () => ({
  ThemeImportExport: () => <div data-testid="theme-import-export" />,
}));

describe('AppearanceSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<AppearanceSettings />);
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays language settings', () => {
    render(<AppearanceSettings />);
    expect(screen.getByText('language')).toBeInTheDocument();
  });

  it('displays theme settings', () => {
    render(<AppearanceSettings />);
    expect(screen.getByText('theme')).toBeInTheDocument();
  });

  it('renders theme options', () => {
    render(<AppearanceSettings />);
    expect(screen.getByText('themeLight')).toBeInTheDocument();
    expect(screen.getByText('themeDark')).toBeInTheDocument();
    expect(screen.getByText('themeSystem')).toBeInTheDocument();
  });

  it('renders language selector', () => {
    render(<AppearanceSettings />);
    expect(screen.getAllByTestId('select').length).toBeGreaterThan(0);
  });

  it('renders switches for preferences', () => {
    render(<AppearanceSettings />);
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);
  });
});
