'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { TokenizerSettings } from './tokenizer-settings';

jest.mock('@/stores/settings/settings-store', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      tokenizerSettings: {
        enablePreciseCounting: true,
        preferredProvider: 'auto',
        autoDetect: true,
        enableCache: true,
        cacheTTL: 300,
        apiTimeout: 5000,
        fallbackToEstimation: true,
        showBreakdown: false,
        showContextWarning: true,
        contextWarningThreshold: 80,
      },
      setTokenizerEnabled: jest.fn(),
      setTokenizerProvider: jest.fn(),
      setTokenizerAutoDetect: jest.fn(),
      setTokenizerCache: jest.fn(),
      setTokenizerCacheTTL: jest.fn(),
      setTokenizerTimeout: jest.fn(),
      setTokenizerFallback: jest.fn(),
      setTokenizerShowBreakdown: jest.fn(),
      setTokenizerContextWarning: jest.fn(),
      setTokenizerContextThreshold: jest.fn(),
      resetTokenizerSettings: jest.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
  selectTokenizerSettings: (state: Record<string, unknown>) => state.tokenizerSettings,
}));

const messages = {
  tokenizerSettings: {
    title: 'Tokenizer Settings',
    description: 'Configure token counting behavior',
    reset: 'Reset',
    enablePreciseCounting: 'Enable Precise Counting',
    enablePreciseCountingDesc: 'Use tokenizer for accurate count',
    enablePreciseCountingTooltip: 'More accurate but slower',
    preferredTokenizer: 'Preferred Tokenizer',
    preferredTokenizerTooltip: 'Select tokenizer provider',
    selectTokenizer: 'Select tokenizer',
    autoDetectByModel: 'Auto-detect by Model',
    autoDetectByModelDesc: 'Select tokenizer based on model',
    enableCaching: 'Enable Caching',
    enableCachingDesc: 'Cache tokenization results',
    cacheTTL: 'Cache TTL',
    cacheTTLRange: '60s - 3600s',
    apiTimeout: 'API Timeout',
    apiTimeoutRange: '1000ms - 30000ms',
    fallbackToEstimation: 'Fallback to Estimation',
    fallbackToEstimationDesc: 'Use estimation when tokenizer fails',
    displayOptions: 'Display Options',
    showTokenBreakdown: 'Show Token Breakdown',
    showTokenBreakdownDesc: 'Show detailed token breakdown',
    contextLimitWarning: 'Context Limit Warning',
    contextLimitWarningDesc: 'Warn when approaching context limit',
    warningThreshold: 'Warning Threshold',
    auto: 'Auto',
    autoDesc: 'Auto-detect',
    tiktoken: 'Tiktoken',
    tiktokenDesc: 'OpenAI tokenizer',
    gpt3: 'GPT-3',
    gpt3Desc: 'GPT-3 tokenizer',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('TokenizerSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tokenizer settings title', () => {
    renderWithProviders(<TokenizerSettings />);
    expect(screen.getByText('Tokenizer Settings')).toBeInTheDocument();
  });

  it('renders enable precise counting switch', () => {
    renderWithProviders(<TokenizerSettings />);
    expect(screen.getByText('Enable Precise Counting')).toBeInTheDocument();
  });

  it('renders preferred tokenizer selector', () => {
    renderWithProviders(<TokenizerSettings />);
    expect(screen.getByText('Preferred Tokenizer')).toBeInTheDocument();
  });

  it('renders auto-detect switch', () => {
    renderWithProviders(<TokenizerSettings />);
    expect(screen.getByText('Auto-detect by Model')).toBeInTheDocument();
  });

  it('renders caching section', () => {
    renderWithProviders(<TokenizerSettings />);
    expect(screen.getByText('Enable Caching')).toBeInTheDocument();
  });

  it('renders API timeout slider', () => {
    renderWithProviders(<TokenizerSettings />);
    expect(screen.getByText('API Timeout')).toBeInTheDocument();
  });

  it('renders fallback switch', () => {
    renderWithProviders(<TokenizerSettings />);
    expect(screen.getByText('Fallback to Estimation')).toBeInTheDocument();
  });

  it('renders display options section', () => {
    renderWithProviders(<TokenizerSettings />);
    expect(screen.getByText('Display Options')).toBeInTheDocument();
  });

  it('renders context warning switch', () => {
    renderWithProviders(<TokenizerSettings />);
    expect(screen.getByText('Context Limit Warning')).toBeInTheDocument();
  });

  it('renders reset button', () => {
    renderWithProviders(<TokenizerSettings />);
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });
});
