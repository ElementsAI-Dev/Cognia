/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomInstructionsSettings } from './custom-instructions-settings';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Custom Instructions',
      description: 'Customize how the AI responds to you',
      enableCustomInstructions: 'Enable Custom Instructions',
      aboutUser: 'About You',
      aboutUserPlaceholder: 'Tell the AI about yourself...',
      responsePreferences: 'Response Preferences',
      responsePreferencesPlaceholder: 'How would you like the AI to respond...',
      customInstructions: 'Custom Instructions',
      customInstructionsPlaceholder: 'Enter custom instructions...',
    };
    return translations[key] || key;
  },
}));

// Mock stores
const mockSetCustomInstructions = jest.fn();
const mockSetCustomInstructionsEnabled = jest.fn();
const mockSetAboutUser = jest.fn();
const mockSetResponsePreferences = jest.fn();

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      customInstructions: '',
      customInstructionsEnabled: true,
      aboutUser: '',
      responsePreferences: '',
      setCustomInstructions: mockSetCustomInstructions,
      setCustomInstructionsEnabled: mockSetCustomInstructionsEnabled,
      setAboutUser: mockSetAboutUser,
      setResponsePreferences: mockSetResponsePreferences,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} data-testid="textarea" />
  ),
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

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('CustomInstructionsSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CustomInstructionsSettings />);
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays custom instructions title', () => {
    render(<CustomInstructionsSettings />);
    expect(screen.getByText('Custom Instructions')).toBeInTheDocument();
  });

  it('displays enable/disable switch', () => {
    render(<CustomInstructionsSettings />);
    expect(screen.getAllByTestId('switch').length).toBeGreaterThan(0);
  });

  it('displays about you section when enabled', () => {
    render(<CustomInstructionsSettings />);
    // Component renders translation keys
    expect(screen.getByText('aboutYou')).toBeInTheDocument();
  });

  it('displays response style section when enabled', () => {
    render(<CustomInstructionsSettings />);
    expect(screen.getByText('responseStyle')).toBeInTheDocument();
  });

  it('displays advanced instructions section when enabled', () => {
    render(<CustomInstructionsSettings />);
    expect(screen.getByText('advancedInstructions')).toBeInTheDocument();
  });

  it('renders textareas for input', () => {
    render(<CustomInstructionsSettings />);
    const textareas = screen.getAllByTestId('textarea');
    expect(textareas.length).toBeGreaterThan(0);
  });

  it('toggles custom instructions enabled state', () => {
    render(<CustomInstructionsSettings />);
    const switches = screen.getAllByTestId('switch');
    fireEvent.click(switches[0]);
    expect(mockSetCustomInstructionsEnabled).toHaveBeenCalled();
  });
});
