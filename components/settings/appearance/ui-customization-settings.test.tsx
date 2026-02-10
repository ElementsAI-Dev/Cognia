/**
 * @jest-environment jsdom
 */
/**
 * UICustomizationSettings tests
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UICustomizationSettings } from './ui-customization-settings';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock settings store
const mockSetBorderRadius = jest.fn();
const mockSetSpacing = jest.fn();
const mockSetShadowIntensity = jest.fn();
const mockSetEnableAnimations = jest.fn();
const mockSetEnableBlur = jest.fn();
const mockSetSidebarWidth = jest.fn();
const mockSetChatMaxWidth = jest.fn();
const mockSetUICustomization = jest.fn();
const mockResetUICustomization = jest.fn();

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      uiCustomization: {
        borderRadius: 'md',
        spacing: 'comfortable',
        shadowIntensity: 'subtle',
        enableAnimations: true,
        enableBlur: true,
        sidebarWidth: 280,
        chatMaxWidth: 800,
        messageDensity: 'comfortable',
        messageAlignment: 'alternate',
        inputPosition: 'bottom',
        timestampFormat: 'relative',
        avatarStyle: 'circle',
        showUserAvatar: true,
        showAssistantAvatar: true,
        uiFontFamily: 'system',
      },
      setBorderRadius: mockSetBorderRadius,
      setSpacing: mockSetSpacing,
      setShadowIntensity: mockSetShadowIntensity,
      setEnableAnimations: mockSetEnableAnimations,
      setEnableBlur: mockSetEnableBlur,
      setSidebarWidth: mockSetSidebarWidth,
      setChatMaxWidth: mockSetChatMaxWidth,
      setUICustomization: mockSetUICustomization,
      resetUICustomization: mockResetUICustomization,
    };
    return selector(state);
  },
}));

// Mock lib/themes
jest.mock('@/lib/themes', () => ({
  applyUICustomization: jest.fn(),
  BORDER_RADIUS_OPTIONS: [
    { value: 'none', labelKey: 'None' },
    { value: 'sm', labelKey: 'Small' },
    { value: 'md', labelKey: 'Medium' },
    { value: 'lg', labelKey: 'Large' },
    { value: 'xl', labelKey: 'Extra Large' },
    { value: 'full', labelKey: 'Full' },
  ],
  SPACING_OPTIONS: [
    { value: 'compact', labelKey: 'Compact' },
    { value: 'comfortable', labelKey: 'Comfortable' },
    { value: 'spacious', labelKey: 'Spacious' },
  ],
  SHADOW_OPTIONS: [
    { value: 'none', labelKey: 'None' },
    { value: 'subtle', labelKey: 'Subtle' },
    { value: 'medium', labelKey: 'Medium' },
    { value: 'strong', labelKey: 'Strong' },
  ],
  MESSAGE_DENSITY_OPTIONS: [
    { value: 'compact', labelKey: 'Compact', descKey: 'CompactDesc' },
    { value: 'comfortable', labelKey: 'Comfortable', descKey: 'ComfortableDesc' },
    { value: 'spacious', labelKey: 'Spacious', descKey: 'SpaciousDesc' },
  ],
  AVATAR_STYLE_OPTIONS: [
    { value: 'circle', labelKey: 'Circle' },
    { value: 'rounded', labelKey: 'Rounded' },
    { value: 'square', labelKey: 'Square' },
    { value: 'hidden', labelKey: 'Hidden' },
  ],
  TIMESTAMP_OPTIONS: [
    { value: 'relative', labelKey: 'Relative' },
    { value: 'absolute', labelKey: 'Absolute' },
    { value: 'both', labelKey: 'Both' },
    { value: 'hidden', labelKey: 'Hidden' },
  ],
  UI_FONT_OPTIONS: [
    { value: 'system', label: 'System Default', fontFamily: 'system-ui' },
    { value: 'inter', label: 'Inter', fontFamily: 'Inter' },
  ],
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Sliders: () => <span>Sliders</span>,
  RotateCcw: () => <span>RotateCcw</span>,
  Layout: () => <span>Layout</span>,
  Sparkles: () => <span>Sparkles</span>,
  MessageSquare: () => <span>MessageSquare</span>,
  User: () => <span>User</span>,
  Clock: () => <span>Clock</span>,
  ChevronDown: () => <span>ChevronDown</span>,
  ChevronUp: () => <span>ChevronUp</span>,
  Type: () => <span>Type</span>,
}));

// Mock lib/utils
jest.mock('@/lib/utils', () => ({
  cn: (...args: (string | boolean | undefined | null)[]) => args.filter(a => typeof a === 'string').join(' '),
}));

// Mock UI components
jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <button role="switch" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)}>switch</button>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange }: { value: number[]; onValueChange?: (v: number[]) => void }) => (
    <input type="range" value={value[0]} onChange={(e) => onValueChange?.([Number(e.target.value)])} data-testid="slider" />
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
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: () => <span>Value</span>,
}));

// Mock Collapsible — collapsed by default, clicking trigger toggles content visibility
jest.mock('@/components/ui/collapsible', () => {
  const CollapsibleImpl = ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="collapsible" data-open={open}>{children}</div>
  );
  const CollapsibleTrigger = ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    asChild ? <>{children}</> : <button>{children}</button>
  );
  const CollapsibleContent = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  );
  return { Collapsible: CollapsibleImpl, CollapsibleTrigger, CollapsibleContent };
});

describe('UICustomizationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders UI customization sections', () => {
    render(<UICustomizationSettings />);
    
    // Always-visible sections: title (customization header) and layout
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('layout')).toBeInTheDocument();
  });

  it('renders collapsible sections for Effects, Chat Messages, Avatars, Typography', () => {
    render(<UICustomizationSettings />);

    expect(screen.getByText('effects')).toBeInTheDocument();
    expect(screen.getByText('chatMessages')).toBeInTheDocument();
    expect(screen.getByText('avatars')).toBeInTheDocument();
    expect(screen.getByText('typography')).toBeInTheDocument();

    // All 4 collapsible sections should default to closed
    const collapsibles = screen.getAllByTestId('collapsible');
    expect(collapsibles).toHaveLength(4);
    collapsibles.forEach((c) => {
      expect(c).toHaveAttribute('data-open', 'false');
    });
  });

  it('renders border radius options (always visible)', () => {
    render(<UICustomizationSettings />);
    
    expect(screen.getByText('borderRadius')).toBeInTheDocument();
    expect(screen.getByText('Small')).toBeInTheDocument();
    expect(screen.getByText('Large')).toBeInTheDocument();
    expect(screen.getByText('Extra Large')).toBeInTheDocument();
    expect(screen.getByText('Full')).toBeInTheDocument();
  });

  it('calls setBorderRadius when border radius option is clicked', () => {
    render(<UICustomizationSettings />);
    
    const smallButton = screen.getByText('Small');
    fireEvent.click(smallButton);
    
    expect(mockSetBorderRadius).toHaveBeenCalledWith('sm');
  });

  it('renders shadow intensity options (always visible)', () => {
    render(<UICustomizationSettings />);
    
    expect(screen.getByText('Subtle')).toBeInTheDocument();
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('calls setShadowIntensity when shadow option is clicked', () => {
    render(<UICustomizationSettings />);
    
    const strongButton = screen.getByText('Strong');
    fireEvent.click(strongButton);
    
    expect(mockSetShadowIntensity).toHaveBeenCalledWith('strong');
  });

  it('renders animation and blur toggles inside Effects collapsible', () => {
    render(<UICustomizationSettings />);
    
    expect(screen.getByText('enableAnimations')).toBeInTheDocument();
    expect(screen.getByText('enableBlur')).toBeInTheDocument();
  });

  it('displays sidebar width value (always visible)', () => {
    render(<UICustomizationSettings />);
    
    expect(screen.getByText('280px')).toBeInTheDocument();
  });

  it('displays chat max width value (always visible)', () => {
    render(<UICustomizationSettings />);
    
    expect(screen.getByText('800px')).toBeInTheDocument();
  });

  it('calls resetUICustomization when reset button is clicked', () => {
    render(<UICustomizationSettings />);
    
    const resetButton = screen.getByText('reset');
    fireEvent.click(resetButton);
    
    expect(mockResetUICustomization).toHaveBeenCalled();
  });

  it('renders spacing select (always visible)', () => {
    render(<UICustomizationSettings />);
    
    expect(screen.getByText('spacing')).toBeInTheDocument();
  });

  it('renders chat message options inside collapsible', () => {
    render(<UICustomizationSettings />);

    expect(screen.getByText('messageDensity')).toBeInTheDocument();
    expect(screen.getByText('messageAlignment')).toBeInTheDocument();
    expect(screen.getByText('inputPosition')).toBeInTheDocument();
    expect(screen.getByText('timestampFormat')).toBeInTheDocument();
  });

  it('renders avatar options inside collapsible', () => {
    render(<UICustomizationSettings />);

    expect(screen.getByText('avatarStyle')).toBeInTheDocument();
    expect(screen.getByText('showUserAvatar')).toBeInTheDocument();
    expect(screen.getByText('showAssistantAvatar')).toBeInTheDocument();
  });

  it('renders typography options inside collapsible', () => {
    render(<UICustomizationSettings />);

    expect(screen.getByText('uiFontFamily')).toBeInTheDocument();
    expect(screen.getByText('fontPreview')).toBeInTheDocument();
  });
});
