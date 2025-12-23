/**
 * Tests for Image Generation utilities
 */

import {
  generateImage,
  editImage,
  createImageVariation,
  downloadImageAsBlob,
  saveImageToFile,
  type ImageGenerationOptions,
  type ImageSize,
  type ImageQuality,
  type ImageStyle,
} from './image-generation';

// Mock OpenAI
const mockGenerate = jest.fn();
const mockEdit = jest.fn();
const mockCreateVariation = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    images: {
      generate: mockGenerate,
      edit: mockEdit,
      createVariation: mockCreateVariation,
    },
  }));
});

// Mock fetch for downloadImageAsBlob
global.fetch = jest.fn();

// Mock DOM APIs for saveImageToFile
const mockCreateObjectURL = jest.fn(() => 'blob:test-url');
const mockRevokeObjectURL = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();

// Mock URL methods
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock document methods using spyOn
const mockAnchorElement = {
  href: '',
  download: '',
  click: mockClick,
  style: {},
};
jest.spyOn(document, 'createElement').mockReturnValue(mockAnchorElement as unknown as HTMLElement);
jest.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
jest.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

describe('generateImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates image with default options', async () => {
    mockGenerate.mockResolvedValue({
      data: [{ url: 'https://example.com/image.png', revised_prompt: 'Enhanced prompt' }],
    });

    const result = await generateImage('test-api-key', {
      prompt: 'A beautiful sunset',
    });

    expect(result.images).toHaveLength(1);
    expect(result.images[0].url).toBe('https://example.com/image.png');
    expect(result.images[0].revisedPrompt).toBe('Enhanced prompt');
    expect(result.model).toBe('dall-e-3');
  });

  it('generates image with custom options', async () => {
    mockGenerate.mockResolvedValue({
      data: [{ url: 'https://example.com/image.png' }],
    });

    const options: ImageGenerationOptions = {
      prompt: 'A beautiful sunset',
      model: 'dall-e-2',
      size: '1024x1792',
      quality: 'hd',
      style: 'natural',
      n: 1,
    };

    const result = await generateImage('test-api-key', options);

    // dall-e-2 validates size to 1024x1024 and quality to standard
    expect(mockGenerate).toHaveBeenCalledWith({
      model: 'dall-e-2',
      prompt: 'A beautiful sunset',
      size: '1024x1024', // validated from 1024x1792
      quality: 'standard', // validated from hd
      style: undefined, // style only for dall-e-3
      n: 1,
      response_format: 'url',
    });
    expect(result.model).toBe('dall-e-2');
  });

  it('handles multiple images', async () => {
    mockGenerate.mockResolvedValue({
      data: [
        { url: 'https://example.com/image1.png' },
        { url: 'https://example.com/image2.png' },
      ],
    });

    const result = await generateImage('test-api-key', {
      prompt: 'A beautiful sunset',
      n: 2,
    });

    expect(result.images).toHaveLength(2);
  });

  it('handles empty response data', async () => {
    mockGenerate.mockResolvedValue({
      data: null,
    });

    const result = await generateImage('test-api-key', {
      prompt: 'A beautiful sunset',
    });

    expect(result.images).toHaveLength(0);
  });
});

describe('editImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('edits image with required options', async () => {
    mockEdit.mockResolvedValue({
      data: [{ url: 'https://example.com/edited.png' }],
    });

    const mockImage = new File([''], 'test.png', { type: 'image/png' });

    const result = await editImage('test-api-key', {
      image: mockImage,
      prompt: 'Add a rainbow',
    });

    expect(result.images).toHaveLength(1);
    expect(result.images[0].url).toBe('https://example.com/edited.png');
    expect(result.model).toBe('dall-e-2');
  });

  it('edits image with mask', async () => {
    mockEdit.mockResolvedValue({
      data: [{ url: 'https://example.com/edited.png' }],
    });

    const mockImage = new File([''], 'test.png', { type: 'image/png' });
    const mockMask = new File([''], 'mask.png', { type: 'image/png' });

    await editImage('test-api-key', {
      image: mockImage,
      mask: mockMask,
      prompt: 'Add a rainbow',
      size: '512x512',
      n: 2,
    });

    expect(mockEdit).toHaveBeenCalledWith({
      model: 'dall-e-2',
      image: mockImage,
      mask: mockMask,
      prompt: 'Add a rainbow',
      size: '512x512',
      n: 2,
      response_format: 'url',
    });
  });

  it('handles empty response data', async () => {
    mockEdit.mockResolvedValue({
      data: null,
    });

    const mockImage = new File([''], 'test.png', { type: 'image/png' });

    const result = await editImage('test-api-key', {
      image: mockImage,
      prompt: 'Add a rainbow',
    });

    expect(result.images).toHaveLength(0);
  });
});

describe('createImageVariation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates variation with default options', async () => {
    mockCreateVariation.mockResolvedValue({
      data: [{ url: 'https://example.com/variation.png' }],
    });

    const mockImage = new File([''], 'test.png', { type: 'image/png' });

    const result = await createImageVariation('test-api-key', {
      image: mockImage,
    });

    expect(result.images).toHaveLength(1);
    expect(result.images[0].url).toBe('https://example.com/variation.png');
    expect(result.model).toBe('dall-e-2');
  });

  it('creates variation with custom options', async () => {
    mockCreateVariation.mockResolvedValue({
      data: [
        { url: 'https://example.com/variation1.png' },
        { url: 'https://example.com/variation2.png' },
      ],
    });

    const mockImage = new File([''], 'test.png', { type: 'image/png' });

    const result = await createImageVariation('test-api-key', {
      image: mockImage,
      size: '256x256',
      n: 2,
    });

    expect(mockCreateVariation).toHaveBeenCalledWith({
      model: 'dall-e-2',
      image: mockImage,
      size: '256x256',
      n: 2,
      response_format: 'url',
    });
    expect(result.images).toHaveLength(2);
  });

  it('handles empty response data', async () => {
    mockCreateVariation.mockResolvedValue({
      data: null,
    });

    const mockImage = new File([''], 'test.png', { type: 'image/png' });

    const result = await createImageVariation('test-api-key', {
      image: mockImage,
    });

    expect(result.images).toHaveLength(0);
  });
});

describe('downloadImageAsBlob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('downloads image and returns blob', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/png' });
    (global.fetch as jest.Mock).mockResolvedValue({
      blob: jest.fn().mockResolvedValue(mockBlob),
    });

    const result = await downloadImageAsBlob('https://example.com/image.png');

    expect(global.fetch).toHaveBeenCalledWith('https://example.com/image.png');
    expect(result).toBe(mockBlob);
  });
});

describe('saveImageToFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates download link and triggers download', () => {
    const mockBlob = new Blob(['test'], { type: 'image/png' });

    saveImageToFile(mockBlob, 'test-image.png');

    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
  });
});

describe('Type exports', () => {
  it('ImageSize type includes valid sizes', () => {
    const sizes: ImageSize[] = ['1024x1024', '1024x1792', '1792x1024'];
    expect(sizes).toHaveLength(3);
  });

  it('ImageQuality type includes valid qualities', () => {
    const qualities: ImageQuality[] = ['standard', 'hd'];
    expect(qualities).toHaveLength(2);
  });

  it('ImageStyle type includes valid styles', () => {
    const styles: ImageStyle[] = ['vivid', 'natural'];
    expect(styles).toHaveLength(2);
  });

  it('ImageGenerationOptions interface has correct structure', () => {
    const options: ImageGenerationOptions = {
      prompt: 'Test prompt',
      model: 'dall-e-3',
      size: '1024x1024',
      quality: 'standard',
      style: 'vivid',
      n: 1,
    };
    expect(options.prompt).toBe('Test prompt');
  });
});
