import { act, renderHook } from '@testing-library/react';
import { usePPTGeneration } from './use-ppt-generation';

const mockAddPresentation = jest.fn();
const mockSetActivePresentation = jest.fn();
const mockLoadPresentation = jest.fn();
const mockGenerateText = jest.fn();

jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) =>
    selector({
      defaultProvider: 'openai',
      providerSettings: {
        openai: {
          apiKey: 'test-api-key',
          defaultModel: 'gpt-4o',
        },
      },
    })
  ),
  useWorkflowStore: jest.fn((selector) =>
    selector({
      addPresentation: mockAddPresentation,
      setActivePresentation: mockSetActivePresentation,
    })
  ),
}));

jest.mock('@/stores/tools/ppt-editor-store', () => ({
  usePPTEditorStore: jest.fn((selector) =>
    selector({
      loadPresentation: mockLoadPresentation,
    })
  ),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

jest.mock('@/lib/ai/utils/ppt-ai-config', () => ({
  resolvePPTAIConfig: jest.fn(() => ({
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: 'test-api-key',
  })),
  createPPTModelInstance: jest.fn(() => 'mock-model'),
}));

jest.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

jest.mock('@/components/ppt/utils/generation-prompts', () => ({
  buildSystemPrompt: jest.fn(() => 'system'),
  buildOutlinePrompt: jest.fn(() => 'outline'),
  buildSlideContentPrompt: jest.fn(() => 'slide-content'),
}));

describe('usePPTGeneration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the review workflow API', () => {
    const { result } = renderHook(() => usePPTGeneration());

    expect(result.current.reviewSession).toBeNull();
    expect(typeof result.current.prepareReview).toBe('function');
    expect(typeof result.current.regenerateReviewOutline).toBe('function');
    expect(typeof result.current.updateReviewOutline).toBe('function');
    expect(typeof result.current.finalizeReview).toBe('function');
    expect(typeof result.current.clearReviewSession).toBe('function');
  });

  it('creates a topic review session before full generation', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        title: 'AI Deck',
        subtitle: 'Overview',
        outline: [
          { slideNumber: 1, title: 'Intro', layout: 'title-content', keyPoints: ['A'] },
          { slideNumber: 2, title: 'Details', layout: 'bullets', keyPoints: ['B'] },
        ],
      }),
    });

    const { result } = renderHook(() => usePPTGeneration());

    await act(async () => {
      await result.current.prepareReview({
        topic: 'AI Deck',
        slideCount: 2,
        theme: {
          id: 'default',
          name: 'Default',
          primaryColor: '#000',
          secondaryColor: '#111',
          accentColor: '#222',
          backgroundColor: '#fff',
          textColor: '#000',
          headingFont: 'Inter',
          bodyFont: 'Inter',
          codeFont: 'Mono',
        },
      });
    });

    expect(result.current.reviewSession).not.toBeNull();
    expect(result.current.reviewSession?.outline.outline).toHaveLength(2);
    expect(result.current.progress.stage).toBe('review');
  });

  it('updates review outline without clearing the session', () => {
    const { result } = renderHook(() => usePPTGeneration());

    act(() => {
      result.current.updateReviewOutline({
        title: 'Draft',
        outline: [{ slideNumber: 1, title: 'Intro', layout: 'title-content' }],
      });
    });

    expect(result.current.outline?.outline[0].title).toBe('Intro');
  });
});
