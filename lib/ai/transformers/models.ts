/**
 * Transformers.js Preset Model Configurations
 * Recommended ONNX models for various tasks, optimized for browser inference.
 */

import type { TransformersTask, TransformersModelConfig, ModelSize } from '@/types/transformers';

export type { ModelSize };

/**
 * Extended model info for UI
 */
export interface TransformersModelInfo extends TransformersModelConfig {
  name: string;
  description: string;
  size: ModelSize;
  sizeInMB: number;
  languages?: string[];
  dimensions?: number;
}

/**
 * Recommended models by task
 */
export const RECOMMENDED_MODELS: Partial<Record<TransformersTask, TransformersModelInfo[]>> = {
  'feature-extraction': [
    {
      task: 'feature-extraction',
      modelId: 'Xenova/all-MiniLM-L6-v2',
      dtype: 'q8',
      name: 'all-MiniLM-L6-v2',
      description: 'Fast sentence embeddings (384d), great for semantic search',
      size: 'small',
      sizeInMB: 23,
      languages: ['en'],
      dimensions: 384,
    },
    {
      task: 'feature-extraction',
      modelId: 'Xenova/bge-small-en-v1.5',
      dtype: 'q8',
      name: 'BGE Small EN v1.5',
      description: 'High-quality embeddings from BAAI (384d)',
      size: 'small',
      sizeInMB: 33,
      languages: ['en'],
      dimensions: 384,
    },
    {
      task: 'feature-extraction',
      modelId: 'Xenova/multilingual-e5-small',
      dtype: 'q8',
      name: 'Multilingual E5 Small',
      description: 'Multilingual embeddings (384d), supports 100+ languages',
      size: 'small',
      sizeInMB: 118,
      languages: ['multilingual'],
      dimensions: 384,
    },
    {
      task: 'feature-extraction',
      modelId: 'Xenova/bge-base-en-v1.5',
      dtype: 'q8',
      name: 'BGE Base EN v1.5',
      description: 'Higher quality embeddings (768d), more accurate',
      size: 'medium',
      sizeInMB: 109,
      languages: ['en'],
      dimensions: 768,
    },
  ],

  'text-classification': [
    {
      task: 'text-classification',
      modelId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      name: 'DistilBERT SST-2',
      description: 'Fast sentiment analysis (positive/negative)',
      size: 'small',
      sizeInMB: 67,
      languages: ['en'],
    },
    {
      task: 'text-classification',
      modelId: 'Xenova/bert-base-multilingual-uncased-sentiment',
      name: 'BERT Multilingual Sentiment',
      description: 'Multilingual sentiment analysis (5 stars)',
      size: 'medium',
      sizeInMB: 178,
      languages: ['multilingual'],
    },
  ],

  'translation': [
    {
      task: 'translation',
      modelId: 'Xenova/nllb-200-distilled-600M',
      dtype: 'q8',
      name: 'NLLB-200 (600M)',
      description: 'Translation between 200+ languages',
      size: 'large',
      sizeInMB: 600,
      languages: ['multilingual'],
    },
  ],

  'summarization': [
    {
      task: 'summarization',
      modelId: 'Xenova/distilbart-cnn-6-6',
      name: 'DistilBART CNN',
      description: 'Fast text summarization',
      size: 'medium',
      sizeInMB: 305,
      languages: ['en'],
    },
  ],

  'text-generation': [
    {
      task: 'text-generation',
      modelId: 'onnx-community/Qwen2.5-0.5B-Instruct',
      dtype: 'q4',
      name: 'Qwen 2.5 0.5B',
      description: 'Small but capable text generation model',
      size: 'medium',
      sizeInMB: 350,
      languages: ['en', 'zh'],
    },
  ],

  'question-answering': [
    {
      task: 'question-answering',
      modelId: 'Xenova/distilbert-base-cased-distilled-squad',
      name: 'DistilBERT SQuAD',
      description: 'Extractive question answering',
      size: 'small',
      sizeInMB: 65,
      languages: ['en'],
    },
  ],

  'zero-shot-classification': [
    {
      task: 'zero-shot-classification',
      modelId: 'Xenova/mobilebert-uncased-mnli',
      name: 'MobileBERT MNLI',
      description: 'Lightweight zero-shot text classification',
      size: 'small',
      sizeInMB: 25,
      languages: ['en'],
    },
  ],

  'automatic-speech-recognition': [
    {
      task: 'automatic-speech-recognition',
      modelId: 'Xenova/whisper-tiny',
      name: 'Whisper Tiny',
      description: 'Fast speech-to-text, multilingual',
      size: 'small',
      sizeInMB: 39,
      languages: ['multilingual'],
    },
    {
      task: 'automatic-speech-recognition',
      modelId: 'Xenova/whisper-small',
      name: 'Whisper Small',
      description: 'Better accuracy speech-to-text',
      size: 'medium',
      sizeInMB: 242,
      languages: ['multilingual'],
    },
  ],

  'image-classification': [
    {
      task: 'image-classification',
      modelId: 'Xenova/vit-base-patch16-224',
      name: 'ViT Base',
      description: 'Image classification with Vision Transformer',
      size: 'medium',
      sizeInMB: 87,
    },
  ],

  'object-detection': [
    {
      task: 'object-detection',
      modelId: 'Xenova/detr-resnet-50',
      name: 'DETR ResNet-50',
      description: 'Object detection in images',
      size: 'medium',
      sizeInMB: 159,
    },
  ],

  'fill-mask': [
    {
      task: 'fill-mask',
      modelId: 'Xenova/bert-base-uncased',
      name: 'BERT Base',
      description: 'Fill in masked words in text',
      size: 'medium',
      sizeInMB: 110,
      languages: ['en'],
    },
  ],

  'token-classification': [
    {
      task: 'token-classification',
      modelId: 'Xenova/bert-base-NER',
      name: 'BERT NER',
      description: 'Named Entity Recognition (person, org, location)',
      size: 'medium',
      sizeInMB: 110,
      languages: ['en'],
    },
  ],
};

/**
 * Default models for each task (first recommended model)
 */
export const DEFAULT_TASK_MODELS: Partial<Record<TransformersTask, string>> = {
  'feature-extraction': 'Xenova/all-MiniLM-L6-v2',
  'text-classification': 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
  'translation': 'Xenova/nllb-200-distilled-600M',
  'summarization': 'Xenova/distilbart-cnn-6-6',
  'text-generation': 'onnx-community/Qwen2.5-0.5B-Instruct',
  'question-answering': 'Xenova/distilbert-base-cased-distilled-squad',
  'zero-shot-classification': 'Xenova/mobilebert-uncased-mnli',
  'automatic-speech-recognition': 'Xenova/whisper-tiny',
  'image-classification': 'Xenova/vit-base-patch16-224',
  'object-detection': 'Xenova/detr-resnet-50',
  'fill-mask': 'Xenova/bert-base-uncased',
  'token-classification': 'Xenova/bert-base-NER',
};

/**
 * Default embedding models for Transformers.js
 */
export const TRANSFORMERS_EMBEDDING_MODELS = {
  'Xenova/all-MiniLM-L6-v2': { dimensions: 384, sizeInMB: 23 },
  'Xenova/bge-small-en-v1.5': { dimensions: 384, sizeInMB: 33 },
  'Xenova/multilingual-e5-small': { dimensions: 384, sizeInMB: 118 },
  'Xenova/bge-base-en-v1.5': { dimensions: 768, sizeInMB: 109 },
} as const;

export type TransformersEmbeddingModelId = keyof typeof TRANSFORMERS_EMBEDDING_MODELS;

/**
 * Get model info by ID
 */
export function getModelInfo(modelId: string): TransformersModelInfo | undefined {
  for (const models of Object.values(RECOMMENDED_MODELS)) {
    const found = models?.find((m) => m.modelId === modelId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Get all models for a task
 */
export function getModelsForTask(task: TransformersTask): TransformersModelInfo[] {
  return RECOMMENDED_MODELS[task] ?? [];
}

/**
 * Get all available tasks that have recommended models
 */
export function getAvailableTasks(): TransformersTask[] {
  return Object.keys(RECOMMENDED_MODELS) as TransformersTask[];
}

/**
 * Task display names for UI
 */
export const TASK_DISPLAY_NAMES: Partial<Record<TransformersTask, string>> = {
  'feature-extraction': 'Embeddings / Feature Extraction',
  'text-classification': 'Text Classification',
  'translation': 'Translation',
  'summarization': 'Summarization',
  'text-generation': 'Text Generation',
  'question-answering': 'Question Answering',
  'zero-shot-classification': 'Zero-Shot Classification',
  'automatic-speech-recognition': 'Speech Recognition',
  'image-classification': 'Image Classification',
  'object-detection': 'Object Detection',
  'fill-mask': 'Fill Mask',
  'token-classification': 'Named Entity Recognition',
  'sentence-similarity': 'Sentence Similarity',
};
