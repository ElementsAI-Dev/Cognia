'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { WelcomeSettings } from './welcome-settings';

jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      welcomeSettings: {
        enabled: true,
        customGreeting: '',
        customDescription: '',
        defaultMode: 'chat',
        maxSuggestionsPerMode: 4,
        sectionsVisibility: {
          header: true,
          featureBadges: true,
          modeSwitcher: true,
          templateSelector: true,
          suggestions: true,
          quickAccess: true,
          a2uiDemo: false,
        },
        hideDefaultSuggestions: false,
        customSuggestions: { chat: [], agent: [], research: [], learning: [] },
        useCustomQuickAccess: false,
        quickAccessLinks: [],
        userName: '',
        timeBasedGreeting: { enabled: false, morning: '', afternoon: '', evening: '', night: '' },
        timeBasedGreetingEnabled: false,
        layoutStyle: 'centered',
        iconConfig: { type: 'default', customIcon: '' },
        gradientConfig: { enabled: false, from: '', to: '', direction: 'to-r' },
        simplifiedSuggestions: { chat: [], agent: [], research: [], learning: [] },
        useCustomSimplifiedSuggestions: false,
      },
      setWelcomeEnabled: jest.fn(),
      setWelcomeCustomGreeting: jest.fn(),
      setWelcomeCustomDescription: jest.fn(),
      setWelcomeSectionVisibility: jest.fn(),
      addWelcomeCustomSuggestion: jest.fn(),
      updateWelcomeCustomSuggestion: jest.fn(),
      removeWelcomeCustomSuggestion: jest.fn(),
      setWelcomeHideDefaultSuggestions: jest.fn(),
      setWelcomeQuickAccessLinks: jest.fn(),
      addWelcomeQuickAccessLink: jest.fn(),
      updateWelcomeQuickAccessLink: jest.fn(),
      removeWelcomeQuickAccessLink: jest.fn(),
      setWelcomeUseCustomQuickAccess: jest.fn(),
      setWelcomeDefaultMode: jest.fn(),
      setWelcomeMaxSuggestions: jest.fn(),
      setWelcomeUserName: jest.fn(),
      setWelcomeTimeBasedGreeting: jest.fn(),
      setWelcomeTimeBasedGreetingEnabled: jest.fn(),
      setWelcomeLayoutStyle: jest.fn(),
      setWelcomeIconConfig: jest.fn(),
      setWelcomeGradientConfig: jest.fn(),
      setWelcomeSimplifiedSuggestions: jest.fn(),
      setWelcomeUseCustomSimplifiedSuggestions: jest.fn(),
      resetWelcomeSettings: jest.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

const messages = {
  welcomeSettings: {
    title: 'Welcome Settings',
    description: 'Configure the welcome page appearance',
    enabled: 'Enabled',
    enabledDescription: 'Show the welcome page',
    customGreeting: 'Custom Greeting',
    customGreetingPlaceholder: 'Enter greeting',
    customGreetingHint: 'Leave empty for default',
    customDescription: 'Custom Description',
    customDescriptionPlaceholder: 'Enter description',
    defaultMode: 'Default Mode',
    maxSuggestions: 'Max Suggestions',
    sectionVisibility: 'Section Visibility',
    sectionVisibilityDescription: 'Choose which sections to show',
    showHeader: 'Show Header',
    showFeatureBadges: 'Show Feature Badges',
    showModeSwitcher: 'Show Mode Switcher',
    showTemplateSelector: 'Show Template Selector',
    showSuggestions: 'Show Suggestions',
    showQuickAccess: 'Show Quick Access',
    showA2UIDemo: 'Show A2UI Demo',
    customSuggestions: 'Custom Suggestions',
    customSuggestionsDescription: 'Add custom suggestions',
    quickAccessLinks: 'Quick Access Links',
    quickAccessLinksDescription: 'Configure quick access links',
    reset: 'Reset',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('WelcomeSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders welcome settings title', () => {
    renderWithProviders(<WelcomeSettings />);
    expect(screen.getByText('Welcome Settings')).toBeInTheDocument();
  });

  it('renders enabled switch', () => {
    renderWithProviders(<WelcomeSettings />);
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('renders custom greeting input', () => {
    renderWithProviders(<WelcomeSettings />);
    expect(screen.getByText('Custom Greeting')).toBeInTheDocument();
  });

  it('renders section visibility card', () => {
    renderWithProviders(<WelcomeSettings />);
    expect(screen.getByText('Section Visibility')).toBeInTheDocument();
  });

  it('renders reset button', () => {
    renderWithProviders(<WelcomeSettings />);
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('renders custom suggestions collapsible', () => {
    renderWithProviders(<WelcomeSettings />);
    expect(screen.getByText('Custom Suggestions')).toBeInTheDocument();
  });

  it('renders quick access links collapsible', () => {
    renderWithProviders(<WelcomeSettings />);
    expect(screen.getByText('Quick Access Links')).toBeInTheDocument();
  });
});
