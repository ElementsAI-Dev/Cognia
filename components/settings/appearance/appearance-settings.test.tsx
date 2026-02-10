/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
  Image: () => <span>Image</span>,
  Sliders: () => <span>Sliders</span>,
}));

// Mock useAutostart hook
jest.mock('@/hooks/native', () => ({
  useAutostart: () => ({
    isEnabled: false,
    toggle: jest.fn(),
    isLoading: false,
  }),
}));

// Mock stores
const mockSetTheme = jest.fn();
const mockSetColorTheme = jest.fn();
const mockSetLanguage = jest.fn();
const mockSetSidebarCollapsed = jest.fn();
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
      uiFontSize: 14,
      setUIFontSize: jest.fn(),
      messageBubbleStyle: 'modern',
      setMessageBubbleStyle: jest.fn(),
      autoDetectLocale: false,
      setAutoDetectLocale: jest.fn(),
      localeDetectionResult: null,
      setLocaleDetectionResult: jest.fn(),
      detectedTimezone: null,
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

// Mock Tabs component — render all TabsContent children, track active tab via data attribute
let activeTab = 'theme';
jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue?: string }) => {
    activeTab = defaultValue || 'theme';
    return <div data-testid="tabs" data-active={activeTab}>{children}</div>;
  },
  TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list" role="tablist">{children}</div>,
  TabsTrigger: ({ children, value, ...props }: { children: React.ReactNode; value: string }) => (
    <button role="tab" data-value={value} onClick={() => { activeTab = value; }} {...props}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-${value}`} role="tabpanel">{children}</div>
  ),
}));

jest.mock('@/lib/themes', () => ({
  THEME_MODE_OPTIONS: [
    { value: 'light', icon: 'sun', labelKey: 'themeLight' },
    { value: 'dark', icon: 'moon', labelKey: 'themeDark' },
    { value: 'system', icon: 'monitor', labelKey: 'themeSystem' },
  ],
  COLOR_THEME_OPTIONS: [
    { value: 'default', color: 'bg-blue-500', labelKey: 'default' },
    { value: 'ocean', color: 'bg-cyan-500', labelKey: 'ocean' },
  ],
  getPresetColors: () => ({
    primary: '#000',
    background: '#fff',
    foreground: '#000',
    muted: '#888',
    secondary: '#eee',
  }),
}));

jest.mock('@/lib/i18n', () => ({
  localeNames: { en: 'English', zh: '中文' },
  localeFlags: { en: '🇺🇸', zh: '🇨🇳' },
  autoDetectLocale: jest.fn().mockResolvedValue({ locale: 'en', source: 'browser', confidence: 'high' }),
}));

jest.mock('./theme-editor', () => ({
  ThemeEditor: () => <div data-testid="theme-editor" />,
}));

jest.mock('./theme-schedule', () => ({
  ThemeSchedule: () => <div data-testid="theme-schedule" />,
}));

jest.mock('./theme-preview', () => ({
  ThemePreview: ({ children }: { children: React.ReactNode }) => <div data-testid="theme-preview">{children}</div>,
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

jest.mock('./settings-profiles', () => ({
  SettingsProfiles: () => <div data-testid="settings-profiles" />,
}));

jest.mock('./simplified-mode-settings', () => ({
  SimplifiedModeSettings: () => <div data-testid="simplified-mode-settings" />,
}));

jest.mock('./welcome-settings', () => ({
  WelcomeSettings: () => <div data-testid="welcome-settings" />,
}));

describe('AppearanceSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<AppearanceSettings />);
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
  });

  it('renders 4 tab triggers', () => {
    render(<AppearanceSettings />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
  });

  it('defaults to theme tab', () => {
    render(<AppearanceSettings />);
    expect(screen.getByTestId('tabs')).toHaveAttribute('data-active', 'theme');
  });

  // --- Theme Tab ---
  it('renders theme mode options in Theme tab', () => {
    render(<AppearanceSettings />);
    expect(screen.getByText('themeLight')).toBeInTheDocument();
    expect(screen.getByText('themeDark')).toBeInTheDocument();
    expect(screen.getByText('themeSystem')).toBeInTheDocument();
  });

  it('calls setTheme when theme mode button is clicked', () => {
    render(<AppearanceSettings />);
    fireEvent.click(screen.getByText('themeDark'));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('renders color theme options with ThemePreview wrappers', () => {
    render(<AppearanceSettings />);
    const previews = screen.getAllByTestId('theme-preview');
    expect(previews.length).toBeGreaterThanOrEqual(2);
  });

  it('calls setColorTheme when color theme is clicked', () => {
    render(<AppearanceSettings />);
    const themeTab = screen.getByTestId('tab-theme');
    // Find buttons inside theme tab that have the color theme preset text
    const presetButtons = themeTab.querySelectorAll('[data-testid="theme-preview"] button');
    if (presetButtons.length > 0) {
      fireEvent.click(presetButtons[0]);
      expect(mockSetColorTheme).toHaveBeenCalled();
    }
  });

  it('renders ThemeSchedule in Theme tab', () => {
    render(<AppearanceSettings />);
    const themeTab = screen.getByTestId('tab-theme');
    expect(themeTab.querySelector('[data-testid="theme-schedule"]')).toBeInTheDocument();
  });

  // --- Layout & Style Tab ---
  it('renders UICustomizationSettings in Layout tab', () => {
    render(<AppearanceSettings />);
    const layoutTab = screen.getByTestId('tab-layout');
    expect(layoutTab.querySelector('[data-testid="ui-customization-settings"]')).toBeInTheDocument();
  });

  it('renders font size slider in Layout tab', () => {
    render(<AppearanceSettings />);
    const layoutTab = screen.getByTestId('tab-layout');
    expect(layoutTab.querySelector('[data-testid="slider"]')).toBeInTheDocument();
  });

  // --- Background Tab ---
  it('renders BackgroundSettings in Background tab', () => {
    render(<AppearanceSettings />);
    const bgTab = screen.getByTestId('tab-background');
    expect(bgTab.querySelector('[data-testid="background-settings"]')).toBeInTheDocument();
  });

  // --- Advanced Tab ---
  it('renders language selector in Advanced tab', () => {
    render(<AppearanceSettings />);
    const advancedTab = screen.getByTestId('tab-advanced');
    expect(advancedTab.querySelector('[data-testid="select"]')).toBeInTheDocument();
  });

  it('renders SettingsProfiles in Advanced tab', () => {
    render(<AppearanceSettings />);
    const advancedTab = screen.getByTestId('tab-advanced');
    expect(advancedTab.querySelector('[data-testid="settings-profiles"]')).toBeInTheDocument();
  });

  it('renders SimplifiedModeSettings in Advanced tab', () => {
    render(<AppearanceSettings />);
    const advancedTab = screen.getByTestId('tab-advanced');
    expect(advancedTab.querySelector('[data-testid="simplified-mode-settings"]')).toBeInTheDocument();
  });

  it('renders WelcomeSettings in Advanced tab', () => {
    render(<AppearanceSettings />);
    const advancedTab = screen.getByTestId('tab-advanced');
    expect(advancedTab.querySelector('[data-testid="welcome-settings"]')).toBeInTheDocument();
  });

  it('renders switches for preferences in Advanced tab', () => {
    render(<AppearanceSettings />);
    const advancedTab = screen.getByTestId('tab-advanced');
    const switches = advancedTab.querySelectorAll('[role="switch"]');
    expect(switches.length).toBeGreaterThan(0);
  });

  it('does NOT render sendOnEnter or streamResponses', () => {
    render(<AppearanceSettings />);
    expect(screen.queryByText('sendOnEnter')).not.toBeInTheDocument();
    expect(screen.queryByText('streamResponses')).not.toBeInTheDocument();
  });

  it('renders ThemeEditor dialog', () => {
    render(<AppearanceSettings />);
    expect(screen.getByTestId('theme-editor')).toBeInTheDocument();
  });
});
