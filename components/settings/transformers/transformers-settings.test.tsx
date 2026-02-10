/**
 * TransformersSettings component tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { TransformersSettings } from './transformers-settings';
import { useTransformersStore } from '@/stores/ai/transformers-store';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock lib/ai/transformers
jest.mock('@/lib/ai/transformers', () => ({
  isWebGPUAvailable: () => false,
  isWebWorkerAvailable: () => true,
  RECOMMENDED_MODELS: {
    'feature-extraction': [
      {
        task: 'feature-extraction',
        modelId: 'Xenova/all-MiniLM-L6-v2',
        name: 'all-MiniLM-L6-v2',
        description: 'Fast sentence embeddings',
        size: 'small',
        sizeInMB: 23,
        dimensions: 384,
      },
    ],
    'text-classification': [
      {
        task: 'text-classification',
        modelId: 'Xenova/distilbert-sst-2',
        name: 'DistilBERT SST-2',
        description: 'Sentiment analysis',
        size: 'small',
        sizeInMB: 67,
      },
    ],
  },
}));

// Mock transformers-manager
const mockLoadModel = jest.fn().mockResolvedValue({ task: 'feature-extraction', modelId: 'Xenova/all-MiniLM-L6-v2', duration: 100 });
const mockDispose = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/ai/transformers/transformers-manager', () => ({
  getTransformersManager: () => ({
    loadModel: mockLoadModel,
    dispose: mockDispose,
  }),
}));

beforeEach(() => {
  useTransformersStore.getState().reset();
  jest.clearAllMocks();
});

describe('TransformersSettings', () => {
  describe('disabled state', () => {
    it('renders title and description', () => {
      render(<TransformersSettings />);
      expect(screen.getByText('title')).toBeInTheDocument();
      expect(screen.getByText('description')).toBeInTheDocument();
    });

    it('does not render performance section when disabled', () => {
      render(<TransformersSettings />);
      expect(screen.queryByText('performance')).not.toBeInTheDocument();
    });
  });

  describe('enabled state', () => {
    beforeEach(() => {
      useTransformersStore.getState().updateSettings({ enabled: true });
    });

    it('renders performance section', () => {
      render(<TransformersSettings />);
      expect(screen.getByText('performance')).toBeInTheDocument();
      expect(screen.getByText('webgpuAcceleration')).toBeInTheDocument();
      expect(screen.getByText('modelPrecision')).toBeInTheDocument();
      expect(screen.getByText('cacheModels')).toBeInTheDocument();
    });

    it('renders loaded models section', () => {
      render(<TransformersSettings />);
      expect(screen.getByText('loadedModels')).toBeInTheDocument();
      expect(screen.getByText('noModelsLoaded')).toBeInTheDocument();
    });

    it('renders available models section', () => {
      render(<TransformersSettings />);
      expect(screen.getByText('availableModels')).toBeInTheDocument();
      expect(screen.getByText('all-MiniLM-L6-v2')).toBeInTheDocument();
      expect(screen.getByText('DistilBERT SST-2')).toBeInTheDocument();
    });

    it('shows load buttons for available models', () => {
      render(<TransformersSettings />);
      const loadButtons = screen.getAllByText('loadModel');
      expect(loadButtons.length).toBe(2);
    });

    it('shows task labels for model groups', () => {
      render(<TransformersSettings />);
      expect(screen.getByText('tasks.featureExtraction')).toBeInTheDocument();
      expect(screen.getByText('tasks.textClassification')).toBeInTheDocument();
    });
  });

  describe('with loaded models', () => {
    beforeEach(() => {
      const store = useTransformersStore.getState();
      store.updateSettings({ enabled: true });
      store.setModelStatus('Xenova/all-MiniLM-L6-v2', 'feature-extraction', 'ready', 100);
    });

    it('shows loaded model with unload button', () => {
      render(<TransformersSettings />);
      expect(screen.getByText('Xenova/all-MiniLM-L6-v2')).toBeInTheDocument();
      const unloadButtons = screen.getAllByText('unloadModel');
      expect(unloadButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('shows clear all button', () => {
      render(<TransformersSettings />);
      expect(screen.getByText('clearAll')).toBeInTheDocument();
    });

    it('clears all models on clearAll click', () => {
      render(<TransformersSettings />);
      fireEvent.click(screen.getByText('clearAll'));
      expect(useTransformersStore.getState().models).toHaveLength(0);
    });

    it('shows ready badge in available models', () => {
      render(<TransformersSettings />);
      expect(screen.getByText('modelReady')).toBeInTheDocument();
    });
  });

  describe('with downloading models', () => {
    beforeEach(() => {
      const store = useTransformersStore.getState();
      store.updateSettings({ enabled: true });
      store.setModelStatus('Xenova/distilbert-sst-2', 'text-classification', 'downloading', 50);
    });

    it('shows downloading section', () => {
      render(<TransformersSettings />);
      expect(screen.getByText('downloading')).toBeInTheDocument();
      expect(screen.getByText('Xenova/distilbert-sst-2')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('with error models', () => {
    beforeEach(() => {
      const store = useTransformersStore.getState();
      store.updateSettings({ enabled: true });
      store.setModelStatus('Xenova/all-MiniLM-L6-v2', 'feature-extraction', 'error', 0, 'Network error');
    });

    it('shows error badge and message', () => {
      render(<TransformersSettings />);
      expect(screen.getByText('modelError')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  describe('model precision select', () => {
    beforeEach(() => {
      useTransformersStore.getState().updateSettings({ enabled: true });
    });

    it('defaults to q8 (INT8)', () => {
      const { settings } = useTransformersStore.getState();
      expect(settings.defaultDtype).toBe('q8');
    });
  });

  describe('className prop', () => {
    it('applies custom className', () => {
      const { container } = render(<TransformersSettings className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
