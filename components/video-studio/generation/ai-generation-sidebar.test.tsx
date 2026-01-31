'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { AIGenerationSidebar } from './ai-generation-sidebar';
import type { AIGenerationSidebarProps } from './ai-generation-sidebar';

jest.mock('../constants', () => ({
  VIDEO_PROMPT_TEMPLATES: [
    { label: 'Nature', prompt: 'Beautiful nature' },
    { label: 'City', prompt: 'Urban cityscape' },
    { label: 'Space', prompt: 'Space exploration' },
    { label: 'Ocean', prompt: 'Deep ocean' },
  ],
  VIDEO_STYLE_PRESETS: [
    { value: 'cinematic', label: 'Cinematic', icon: '🎬', description: 'Film style' },
    { value: 'anime', label: 'Anime', icon: '🎨', description: 'Anime style' },
  ],
  RESOLUTION_OPTIONS: [
    { value: '1080p', label: '1080p', description: 'Full HD' },
    { value: '720p', label: '720p', description: 'HD' },
  ],
  ASPECT_RATIO_OPTIONS: [
    { value: '16:9', label: '16:9', icon: '▭' },
    { value: '9:16', label: '9:16', icon: '▯' },
    { value: '1:1', label: '1:1', icon: '□' },
  ],
  DURATION_OPTIONS: [
    { value: '5', label: '5 seconds' },
    { value: '10', label: '10 seconds' },
  ],
}));

const messages = {
  videoGeneration: {
    text: 'Text to Video',
    image: 'Image to Video',
    prompt: 'Prompt',
    promptPlaceholder: 'Describe your video...',
    negativePrompt: 'Negative Prompt',
    negativePromptPlaceholder: 'What to avoid...',
    quickTemplates: 'Quick Templates',
    referenceImage: 'Reference Image',
    remove: 'Remove',
    advancedOptions: 'Advanced Options',
    provider: 'Provider',
    model: 'Model',
    resolution: 'Resolution',
    aspectRatio: 'Aspect Ratio',
    duration: 'Duration',
    style: 'Style',
    fpsDisplay: '{fps} FPS',
    enhancePrompt: 'Enhance Prompt',
    includeAudio: 'Include Audio',
    audioPrompt: 'Audio Prompt',
    audioPromptPlaceholder: 'Describe audio...',
    seed: 'Seed',
    seedPlaceholder: 'Random',
    estimatedCost: 'Estimated Cost',
    generating: 'Generating...',
    generate: 'Generate Video',
    templates: {
      Nature: 'Nature',
      City: 'City',
      Space: 'Space',
      Ocean: 'Ocean',
    },
    resolutions: {},
    durations: {},
    styles: {},
    styleDescriptions: {},
  },
};

const defaultProps: AIGenerationSidebarProps = {
  activeTab: 'text-to-video',
  onActiveTabChange: jest.fn(),
  prompt: '',
  onPromptChange: jest.fn(),
  negativePrompt: '',
  onNegativePromptChange: jest.fn(),
  referenceImage: null,
  onImageUpload: jest.fn(),
  onClearImage: jest.fn(),
  showSettings: false,
  onShowSettingsChange: jest.fn(),
  showMoreTemplates: false,
  onShowMoreTemplatesChange: jest.fn(),
  provider: 'google-veo',
  onProviderChange: jest.fn(),
  model: 'veo-3',
  onModelChange: jest.fn(),
  providerModels: [{ id: 'veo-3', name: 'Veo 3', provider: 'google-veo' }],
  resolution: '1080p',
  onResolutionChange: jest.fn(),
  aspectRatio: '16:9',
  onAspectRatioChange: jest.fn(),
  duration: '5s',
  onDurationChange: jest.fn(),
  style: 'cinematic',
  onStyleChange: jest.fn(),
  fps: 30,
  onFpsChange: jest.fn(),
  enhancePrompt: true,
  onEnhancePromptChange: jest.fn(),
  includeAudio: false,
  onIncludeAudioChange: jest.fn(),
  audioPrompt: '',
  onAudioPromptChange: jest.fn(),
  seed: undefined,
  onSeedChange: jest.fn(),
  isGenerating: false,
  error: null,
  estimatedCost: 0.5,
  onGenerate: jest.fn(),
};

const renderWithProviders = (props: Partial<AIGenerationSidebarProps> = {}) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AIGenerationSidebar {...defaultProps} {...props} />
    </NextIntlClientProvider>
  );
};

describe('AIGenerationSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tab buttons', () => {
    renderWithProviders();
    // Component uses t('text') and t('image') which resolve to i18n keys
    expect(screen.getByRole('tab', { name: /text/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /image/i })).toBeInTheDocument();
  });

  it('renders prompt textarea', () => {
    renderWithProviders();
    const textboxes = screen.getAllByRole('textbox');
    expect(textboxes.length).toBeGreaterThan(0);
  });

  it('renders generate button', () => {
    renderWithProviders();
    // Button text from t('generate')
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
  });

  it('shows generating state', () => {
    renderWithProviders({ isGenerating: true });
    expect(screen.getByRole('button', { name: /generating/i })).toBeInTheDocument();
  });

  it('renders estimated cost', () => {
    renderWithProviders();
    expect(screen.getByText('$0.50')).toBeInTheDocument();
  });

  it('calls onGenerate when button clicked', () => {
    const onGenerate = jest.fn();
    renderWithProviders({ prompt: 'test', onGenerate });
    const generateButton = screen.getByRole('button', { name: /generate/i });
    fireEvent.click(generateButton);
    expect(onGenerate).toHaveBeenCalled();
  });

  it('disables generate when no prompt', () => {
    renderWithProviders({ prompt: '' });
    const generateButton = screen.getByRole('button', { name: /generate/i });
    expect(generateButton).toBeDisabled();
  });
});
