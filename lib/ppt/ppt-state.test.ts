import {
  classifyPPTError,
  isValidHttpUrl,
  normalizeCreationTopic,
  validatePPTCreationInput,
} from './ppt-state';

describe('ppt-state', () => {
  it('validates http(s) URL format', () => {
    expect(isValidHttpUrl('https://example.com')).toBe(true);
    expect(isValidHttpUrl('http://localhost:3000/path')).toBe(true);
    expect(isValidHttpUrl('ftp://example.com')).toBe(false);
    expect(isValidHttpUrl('not-a-url')).toBe(false);
  });

  it('normalizes topic from URL hostname when import topic is empty', () => {
    const topic = normalizeCreationTopic({
      mode: 'import',
      topic: '   ',
      importUrl: 'https://docs.example.com/article',
      hasImportedFile: false,
    });
    expect(topic).toBe('docs.example.com');
  });

  it('requires material for import mode', () => {
    const result = validatePPTCreationInput({
      mode: 'import',
      topic: 'Quarterly Review',
      hasImportedFile: false,
      importUrl: '',
    });
    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'material_required')).toBe(true);
  });

  it('requires minimum paste text length', () => {
    const result = validatePPTCreationInput({
      mode: 'paste',
      topic: 'Test',
      pastedText: 'short',
    });
    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'paste_too_short')).toBe(true);
  });

  it('classifies parse errors', () => {
    const error = classifyPPTError(new Error('Failed to parse AI response as JSON'));
    expect(error.code).toBe('parse_failed');
  });
});

