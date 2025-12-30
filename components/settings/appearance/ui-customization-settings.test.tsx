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
      },
      setBorderRadius: mockSetBorderRadius,
      setSpacing: mockSetSpacing,
      setShadowIntensity: mockSetShadowIntensity,
      setEnableAnimations: mockSetEnableAnimations,
      setEnableBlur: mockSetEnableBlur,
      setSidebarWidth: mockSetSidebarWidth,
      setChatMaxWidth: mockSetChatMaxWidth,
      resetUICustomization: mockResetUICustomization,
    };
    return selector(state);
  },
}));

// Mock lib/themes
jest.mock('@/lib/themes', () => ({
  applyUICustomization: jest.fn(),
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
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
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

describe('UICustomizationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders UI customization sections', () => {
    render(<UICustomizationSettings />);
    
    expect(screen.getByText('uiCustomization')).toBeInTheDocument();
    expect(screen.getByText('effects')).toBeInTheDocument();
    expect(screen.getByText('layout')).toBeInTheDocument();
  });

  it('renders border radius options', () => {
    render(<UICustomizationSettings />);
    
    // Border radius has 6 options, shadow has 4 - "None" appears in both
    expect(screen.getAllByText('None').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Small')).toBeInTheDocument();
    expect(screen.getAllByText('Medium').length).toBeGreaterThanOrEqual(1);
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

  it('renders shadow intensity options', () => {
    render(<UICustomizationSettings />);
    
    // Shadow options: Subtle, Strong are unique; None and Medium appear in multiple places
    expect(screen.getByText('Subtle')).toBeInTheDocument();
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('calls setShadowIntensity when shadow option is clicked', () => {
    render(<UICustomizationSettings />);
    
    const strongButton = screen.getByText('Strong');
    fireEvent.click(strongButton);
    
    expect(mockSetShadowIntensity).toHaveBeenCalledWith('strong');
  });

  it('renders animation toggle', () => {
    render(<UICustomizationSettings />);
    
    expect(screen.getByText('enableAnimations')).toBeInTheDocument();
  });

  it('renders blur toggle', () => {
    render(<UICustomizationSettings />);
    
    expect(screen.getByText('enableBlur')).toBeInTheDocument();
  });

  it('displays sidebar width value', () => {
    render(<UICustomizationSettings />);
    
    expect(screen.getByText('280px')).toBeInTheDocument();
  });

  it('displays chat max width value', () => {
    render(<UICustomizationSettings />);
    
    expect(screen.getByText('800px')).toBeInTheDocument();
  });

  it('calls resetUICustomization when reset button is clicked', () => {
    render(<UICustomizationSettings />);
    
    const resetButton = screen.getByText('reset');
    fireEvent.click(resetButton);
    
    expect(mockResetUICustomization).toHaveBeenCalled();
  });

  it('renders spacing select', () => {
    render(<UICustomizationSettings />);
    
    expect(screen.getByText('spacing')).toBeInTheDocument();
  });
});
