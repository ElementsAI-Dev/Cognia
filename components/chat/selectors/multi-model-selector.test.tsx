/**
 * Tests for MultiModelSelector component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { MultiModelSelector } from './multi-model-selector';
import type { ArenaModelConfig } from '@/types/chat/multi-model';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      addModel: 'Add Model',
      presets: 'Presets',
      noModelsConfigured: 'No models configured',
      selectModelsHint: `Select ${params?.min || 2}-${params?.max || 4} models`,
    };
    return translations[key] || key;
  },
}));

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      providerSettings: {
        openai: { apiKey: 'test-key', enabled: true },
        anthropic: { apiKey: 'test-key', enabled: true },
        google: { apiKey: 'test-key', enabled: true },
      },
    };
    return selector(state);
  }),
}));

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id-' + Math.random().toString(36).slice(2)),
}));

// Mock arena presets
jest.mock('@/types/arena', () => ({
  ARENA_MODEL_PRESETS: [
    {
      id: 'preset-1',
      name: 'GPT vs Claude',
      models: [
        { provider: 'openai', model: 'gpt-4o' },
        { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      ],
    },
  ],
}));

const createMockModels = (): ArenaModelConfig[] => [
  {
    id: 'model-1',
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'GPT-4o',
    columnIndex: 0,
  },
];

describe('MultiModelSelector', () => {
  const mockOnModelsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      render(
        <MultiModelSelector models={[]} onModelsChange={mockOnModelsChange} />
      );

      expect(screen.getByText('Add Model')).toBeInTheDocument();
    });

    it('should render selected models as badges', () => {
      const models = createMockModels();
      render(
        <MultiModelSelector models={models} onModelsChange={mockOnModelsChange} />
      );

      expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    });

    it('should show Add Model button when under max models', () => {
      render(
        <MultiModelSelector
          models={[]}
          onModelsChange={mockOnModelsChange}
          maxModels={4}
        />
      );

      expect(screen.getByText('Add Model')).toBeInTheDocument();
    });

    it('should hide Add Model button when at max models', () => {
      const models: ArenaModelConfig[] = [
        { id: '1', provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o', columnIndex: 0 },
        { id: '2', provider: 'anthropic', model: 'claude-3', displayName: 'Claude 3', columnIndex: 1 },
        { id: '3', provider: 'google', model: 'gemini', displayName: 'Gemini', columnIndex: 2 },
        { id: '4', provider: 'deepseek', model: 'deepseek', displayName: 'DeepSeek', columnIndex: 3 },
      ];
      render(
        <MultiModelSelector
          models={models}
          onModelsChange={mockOnModelsChange}
          maxModels={4}
        />
      );

      expect(screen.queryByText('Add Model')).not.toBeInTheDocument();
    });

    it('should display column letters (A, B, C, D) for each model', () => {
      const models: ArenaModelConfig[] = [
        { id: '1', provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o', columnIndex: 0 },
        { id: '2', provider: 'anthropic', model: 'claude-3', displayName: 'Claude 3', columnIndex: 1 },
      ];
      render(
        <MultiModelSelector models={models} onModelsChange={mockOnModelsChange} />
      );

      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onModelsChange when removing a model', () => {
      const models = createMockModels();
      render(
        <MultiModelSelector models={models} onModelsChange={mockOnModelsChange} />
      );

      const removeButton = screen.getByLabelText('Remove GPT-4o');
      fireEvent.click(removeButton);

      expect(mockOnModelsChange).toHaveBeenCalledWith([]);
    });

    it('should open popover when clicking Add Model button', () => {
      render(
        <MultiModelSelector models={[]} onModelsChange={mockOnModelsChange} />
      );

      const addButton = screen.getByText('Add Model');
      fireEvent.click(addButton);

      expect(screen.getByText('Presets')).toBeInTheDocument();
    });

    it('should disable Add Model button when disabled prop is true', () => {
      render(
        <MultiModelSelector
          models={[]}
          onModelsChange={mockOnModelsChange}
          disabled={true}
        />
      );

      const addButton = screen.getByText('Add Model').closest('button');
      expect(addButton).toBeDisabled();
    });

    it('should disable remove buttons when disabled prop is true', () => {
      const models = createMockModels();
      render(
        <MultiModelSelector
          models={models}
          onModelsChange={mockOnModelsChange}
          disabled={true}
        />
      );

      const removeButton = screen.getByLabelText('Remove GPT-4o');
      expect(removeButton).toBeDisabled();
    });
  });

  describe('model selection', () => {
    it('should show available models in popover', () => {
      render(
        <MultiModelSelector models={[]} onModelsChange={mockOnModelsChange} />
      );

      const addButton = screen.getByText('Add Model');
      fireEvent.click(addButton);

      // Should show available models from configured providers
      expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    });

    it('should show hint text in popover footer', () => {
      render(
        <MultiModelSelector
          models={[]}
          onModelsChange={mockOnModelsChange}
          maxModels={4}
        />
      );

      const addButton = screen.getByText('Add Model');
      fireEvent.click(addButton);

      expect(screen.getByText('Select 2-4 models')).toBeInTheDocument();
    });
  });

  describe('presets', () => {
    it('should show preset buttons in popover', () => {
      render(
        <MultiModelSelector models={[]} onModelsChange={mockOnModelsChange} />
      );

      const addButton = screen.getByText('Add Model');
      fireEvent.click(addButton);

      expect(screen.getByText('GPT vs Claude')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <MultiModelSelector
          models={[]}
          onModelsChange={mockOnModelsChange}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should apply provider-specific colors to badges', () => {
      const models: ArenaModelConfig[] = [
        { id: '1', provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o', columnIndex: 0 },
      ];
      const { container } = render(
        <MultiModelSelector models={models} onModelsChange={mockOnModelsChange} />
      );

      // Find badge containing the model name - badges use specific class patterns
      const badgeElement = container.querySelector('[class*="bg-green"]');
      expect(badgeElement).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty models array', () => {
      render(
        <MultiModelSelector models={[]} onModelsChange={mockOnModelsChange} />
      );

      expect(screen.getByText('Add Model')).toBeInTheDocument();
    });

    it('should recalculate column indices when removing middle model', () => {
      const models: ArenaModelConfig[] = [
        { id: '1', provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o', columnIndex: 0 },
        { id: '2', provider: 'anthropic', model: 'claude-3', displayName: 'Claude 3', columnIndex: 1 },
        { id: '3', provider: 'google', model: 'gemini', displayName: 'Gemini', columnIndex: 2 },
      ];
      render(
        <MultiModelSelector models={models} onModelsChange={mockOnModelsChange} />
      );

      const removeButton = screen.getByLabelText('Remove Claude 3');
      fireEvent.click(removeButton);

      // Should have updated column indices
      expect(mockOnModelsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: '1', columnIndex: 0 }),
          expect.objectContaining({ id: '3', columnIndex: 1 }),
        ])
      );
    });
  });
});
