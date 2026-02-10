/**
 * Transformers.js Models utility tests
 */

import {
  RECOMMENDED_MODELS,
  DEFAULT_TASK_MODELS,
  TRANSFORMERS_EMBEDDING_MODELS,
  TASK_DISPLAY_NAMES,
  getModelInfo,
  getModelsForTask,
  getAvailableTasks,
} from './models';

describe('RECOMMENDED_MODELS', () => {
  it('has feature-extraction models', () => {
    const models = RECOMMENDED_MODELS['feature-extraction'];
    expect(models).toBeDefined();
    expect(models!.length).toBeGreaterThan(0);
  });

  it('has text-classification models', () => {
    const models = RECOMMENDED_MODELS['text-classification'];
    expect(models).toBeDefined();
    expect(models!.length).toBeGreaterThan(0);
  });

  it('all models have required fields', () => {
    for (const [task, models] of Object.entries(RECOMMENDED_MODELS)) {
      if (!models) continue;
      for (const model of models) {
        expect(model.task).toBe(task);
        expect(model.modelId).toBeTruthy();
        expect(model.name).toBeTruthy();
        expect(model.description).toBeTruthy();
        expect(model.size).toBeTruthy();
        expect(model.sizeInMB).toBeGreaterThan(0);
      }
    }
  });

  it('embedding models have dimensions field', () => {
    const models = RECOMMENDED_MODELS['feature-extraction']!;
    for (const model of models) {
      expect(model.dimensions).toBeDefined();
      expect(model.dimensions).toBeGreaterThan(0);
    }
  });
});

describe('DEFAULT_TASK_MODELS', () => {
  it('has defaults for common tasks', () => {
    expect(DEFAULT_TASK_MODELS['feature-extraction']).toBe('Xenova/all-MiniLM-L6-v2');
    expect(DEFAULT_TASK_MODELS['text-classification']).toBe('Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    expect(DEFAULT_TASK_MODELS['question-answering']).toBe('Xenova/distilbert-base-cased-distilled-squad');
  });

  it('all default models exist in RECOMMENDED_MODELS', () => {
    for (const [task, modelId] of Object.entries(DEFAULT_TASK_MODELS)) {
      const models = RECOMMENDED_MODELS[task as keyof typeof RECOMMENDED_MODELS];
      expect(models).toBeDefined();
      const found = models!.find((m) => m.modelId === modelId);
      expect(found).toBeDefined();
    }
  });
});

describe('TRANSFORMERS_EMBEDDING_MODELS', () => {
  it('contains expected models', () => {
    expect(TRANSFORMERS_EMBEDDING_MODELS['Xenova/all-MiniLM-L6-v2']).toBeDefined();
    expect(TRANSFORMERS_EMBEDDING_MODELS['Xenova/bge-small-en-v1.5']).toBeDefined();
  });

  it('all models have dimensions and sizeInMB', () => {
    for (const config of Object.values(TRANSFORMERS_EMBEDDING_MODELS)) {
      expect(config.dimensions).toBeGreaterThan(0);
      expect(config.sizeInMB).toBeGreaterThan(0);
    }
  });
});

describe('TASK_DISPLAY_NAMES', () => {
  it('has display names for main tasks', () => {
    expect(TASK_DISPLAY_NAMES['feature-extraction']).toBe('Embeddings / Feature Extraction');
    expect(TASK_DISPLAY_NAMES['text-classification']).toBe('Text Classification');
    expect(TASK_DISPLAY_NAMES['translation']).toBe('Translation');
    expect(TASK_DISPLAY_NAMES['automatic-speech-recognition']).toBe('Speech Recognition');
  });
});

describe('getModelInfo', () => {
  it('returns model info for known model', () => {
    const info = getModelInfo('Xenova/all-MiniLM-L6-v2');
    expect(info).toBeDefined();
    expect(info!.task).toBe('feature-extraction');
    expect(info!.name).toBe('all-MiniLM-L6-v2');
    expect(info!.dimensions).toBe(384);
  });

  it('returns model info for text-classification model', () => {
    const info = getModelInfo('Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    expect(info).toBeDefined();
    expect(info!.task).toBe('text-classification');
  });

  it('returns undefined for unknown model', () => {
    const info = getModelInfo('Xenova/nonexistent-model');
    expect(info).toBeUndefined();
  });
});

describe('getModelsForTask', () => {
  it('returns models for feature-extraction', () => {
    const models = getModelsForTask('feature-extraction');
    expect(models.length).toBeGreaterThan(0);
    expect(models.every((m) => m.task === 'feature-extraction')).toBe(true);
  });

  it('returns models for text-classification', () => {
    const models = getModelsForTask('text-classification');
    expect(models.length).toBeGreaterThan(0);
  });

  it('returns empty array for unsupported task', () => {
    // sentence-similarity has no recommended models
    const models = getModelsForTask('sentence-similarity');
    expect(models).toEqual([]);
  });
});

describe('getAvailableTasks', () => {
  it('returns an array of tasks', () => {
    const tasks = getAvailableTasks();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThan(0);
  });

  it('includes common tasks', () => {
    const tasks = getAvailableTasks();
    expect(tasks).toContain('feature-extraction');
    expect(tasks).toContain('text-classification');
    expect(tasks).toContain('translation');
    expect(tasks).toContain('question-answering');
  });

  it('all returned tasks have at least one model', () => {
    const tasks = getAvailableTasks();
    for (const task of tasks) {
      const models = getModelsForTask(task);
      expect(models.length).toBeGreaterThan(0);
    }
  });
});
