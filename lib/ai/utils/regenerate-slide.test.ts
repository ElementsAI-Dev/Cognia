/**
 * Tests for regenerateSlideContent utility
 */

import { regenerateSlideContent } from './regenerate-slide';
import type { PPTPresentation, PPTSlide } from '@/types/workflow';

// Mock generateText from 'ai'
const mockGenerateText = jest.fn();
jest.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

// Mock getProxyProviderModel
const mockGetProxyProviderModel = jest.fn().mockReturnValue('mock-model');
jest.mock('@/lib/ai/core/proxy-client', () => ({
  getProxyProviderModel: (...args: unknown[]) => mockGetProxyProviderModel(...args),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  loggers: {
    ai: {
      error: jest.fn(),
    },
  },
}));

// Mock stores
const mockSettings = {
  defaultProvider: 'openai',
  providerSettings: {
    openai: {
      apiKey: 'test-api-key',
      defaultModel: 'gpt-4o',
      baseURL: undefined,
    },
  },
};
jest.mock('@/stores', () => ({
  useSettingsStore: {
    getState: () => mockSettings,
  },
}));

const mockSlide: PPTSlide = {
  id: 'slide-1',
  layout: 'title-content',
  title: 'Test Title',
  subtitle: 'Test Subtitle',
  content: 'Test content',
  bullets: ['Point 1', 'Point 2'],
  notes: 'Original notes',
  order: 0,
  elements: [],
};

const mockPresentation: PPTPresentation = {
  id: 'pres-1',
  title: 'Test Presentation',
  subtitle: 'A test presentation',
  slides: [mockSlide],
  theme: {
    id: 'default',
    name: 'Default',
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    accentColor: '#0056b3',
    backgroundColor: '#ffffff',
    textColor: '#212529',
    headingFont: 'Arial',
    bodyFont: 'Arial',
    codeFont: 'Consolas',
  },
  totalSlides: 1,
  aspectRatio: '16:9',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('regenerateSlideContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettings.providerSettings.openai.apiKey = 'test-api-key';
  });

  it('should regenerate slide content successfully', async () => {
    const aiResponse = {
      title: 'New Title',
      subtitle: 'New Subtitle',
      content: 'New content',
      bullets: ['New Point 1', 'New Point 2'],
      notes: 'New notes',
    };

    mockGenerateText.mockResolvedValue({ text: JSON.stringify(aiResponse) });

    const result = await regenerateSlideContent(mockSlide, mockPresentation);

    expect(result).toEqual({
      title: 'New Title',
      subtitle: 'New Subtitle',
      content: 'New content',
      bullets: ['New Point 1', 'New Point 2'],
      notes: 'New notes',
    });
  });

  it('should call getProxyProviderModel with correct args', async () => {
    mockGenerateText.mockResolvedValue({ text: '{"title": "Test"}' });

    await regenerateSlideContent(mockSlide, mockPresentation);

    expect(mockGetProxyProviderModel).toHaveBeenCalledWith(
      'openai',
      'gpt-4o',
      'test-api-key',
      undefined,
      true
    );
  });

  it('should call generateText with system prompt and temperature', async () => {
    mockGenerateText.mockResolvedValue({ text: '{"title": "Test"}' });

    await regenerateSlideContent(mockSlide, mockPresentation);

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mock-model',
        system: 'You are an expert presentation designer. Always respond with valid JSON.',
        temperature: 0.7,
      })
    );
  });

  it('should return null when no API key is configured', async () => {
    mockSettings.providerSettings.openai.apiKey = '';

    const result = await regenerateSlideContent(mockSlide, mockPresentation);

    expect(result).toBeNull();
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('should return null on AI error', async () => {
    mockGenerateText.mockRejectedValue(new Error('API Error'));

    const result = await regenerateSlideContent(mockSlide, mockPresentation);

    expect(result).toBeNull();
  });

  it('should return null on JSON parse error', async () => {
    mockGenerateText.mockResolvedValue({ text: 'not valid json at all' });

    const result = await regenerateSlideContent(mockSlide, mockPresentation);

    expect(result).toBeNull();
  });

  it('should handle partial results', async () => {
    mockGenerateText.mockResolvedValue({
      text: JSON.stringify({ title: 'Only Title' }),
    });

    const result = await regenerateSlideContent(mockSlide, mockPresentation);

    expect(result).toEqual({
      title: 'Only Title',
      subtitle: undefined,
      content: undefined,
      bullets: undefined,
      notes: undefined,
    });
  });

  it('should include context from adjacent slides in prompt', async () => {
    const multiSlidePresentation: PPTPresentation = {
      ...mockPresentation,
      slides: [
        { ...mockSlide, id: 'slide-0', title: 'Previous Slide' },
        { ...mockSlide, id: 'slide-1', title: 'Current Slide' },
        { ...mockSlide, id: 'slide-2', title: 'Next Slide' },
      ],
    };

    mockGenerateText.mockResolvedValue({ text: '{"title": "Regenerated"}' });

    await regenerateSlideContent(
      multiSlidePresentation.slides[1],
      multiSlidePresentation
    );

    const promptArg = mockGenerateText.mock.calls[0][0].prompt as string;
    expect(promptArg).toContain('Previous slide: Previous Slide');
    expect(promptArg).toContain('Next slide: Next Slide');
  });
});
