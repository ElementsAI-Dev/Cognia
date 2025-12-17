/**
 * Tests for Suggestion Generator utilities
 */

import {
  getDefaultSuggestions,
  extractTopic,
} from './suggestion-generator';

describe('getDefaultSuggestions', () => {
  it('returns default suggestions when no topic provided', () => {
    const suggestions = getDefaultSuggestions();
    
    expect(suggestions).toHaveLength(4);
    suggestions.forEach((suggestion) => {
      expect(suggestion.text).toBeDefined();
      expect(suggestion.category).toBeDefined();
    });
  });

  it('returns all required categories', () => {
    const suggestions = getDefaultSuggestions();
    const categories = suggestions.map((s) => s.category);
    
    expect(categories).toContain('follow-up');
    expect(categories).toContain('clarification');
    expect(categories).toContain('exploration');
    expect(categories).toContain('action');
  });

  it('returns topic-specific suggestions when topic provided', () => {
    const suggestions = getDefaultSuggestions('React');
    
    expect(suggestions).toHaveLength(4);
    suggestions.forEach((suggestion) => {
      expect(suggestion.text.toLowerCase()).toContain('react');
    });
  });

  it('includes clarification for topic', () => {
    const suggestions = getDefaultSuggestions('TypeScript');
    const clarification = suggestions.find((s) => s.category === 'clarification');
    
    expect(clarification).toBeDefined();
    expect(clarification?.text.toLowerCase()).toContain('typescript');
  });

  it('includes exploration for topic', () => {
    const suggestions = getDefaultSuggestions('Python');
    const exploration = suggestions.find((s) => s.category === 'exploration');
    
    expect(exploration).toBeDefined();
    expect(exploration?.text.toLowerCase()).toContain('python');
  });

  it('includes action for topic', () => {
    const suggestions = getDefaultSuggestions('Docker');
    const action = suggestions.find((s) => s.category === 'action');
    
    expect(action).toBeDefined();
    expect(action?.text.toLowerCase()).toContain('docker');
  });

  it('includes follow-up for topic', () => {
    const suggestions = getDefaultSuggestions('Kubernetes');
    const followUp = suggestions.find((s) => s.category === 'follow-up');
    
    expect(followUp).toBeDefined();
    expect(followUp?.text.toLowerCase()).toContain('kubernetes');
  });

  it('handles empty string topic', () => {
    const suggestions = getDefaultSuggestions('');
    
    expect(suggestions).toHaveLength(4);
  });
});

describe('extractTopic', () => {
  it('extracts significant word from simple message', () => {
    const topic = extractTopic('Tell me about TypeScript');
    
    expect(topic).toBe('typescript');
  });

  it('filters out stop words', () => {
    const topic = extractTopic('What is the best way');
    
    expect(topic).toBe('best');
  });

  it('returns undefined for message with only stop words', () => {
    const topic = extractTopic('the is a an');
    
    expect(topic).toBeUndefined();
  });

  it('filters out short words', () => {
    const topic = extractTopic('go to the api');
    
    expect(topic).toBeUndefined();
  });

  it('returns first significant word', () => {
    const topic = extractTopic('React and TypeScript are great');
    
    expect(topic).toBe('react');
  });

  it('handles empty string', () => {
    const topic = extractTopic('');
    
    expect(topic).toBeUndefined();
  });

  it('handles single word messages', () => {
    const topic = extractTopic('JavaScript');
    
    expect(topic).toBe('javascript');
  });

  it('converts to lowercase', () => {
    const topic = extractTopic('REACT HOOKS');
    
    expect(topic).toBe('react');
  });

  it('handles punctuation in messages', () => {
    const topic = extractTopic('What about React?');
    
    expect(topic).toBe('react?');
  });

  it('extracts topic from longer messages', () => {
    const topic = extractTopic('Can you explain how machine learning algorithms work?');
    
    expect(topic).toBeDefined();
    expect(['explain', 'machine', 'learning', 'algorithms', 'work'].includes(topic!)).toBe(true);
  });

  it('filters common programming stop words', () => {
    const topic = extractTopic('how to use this function');
    
    expect(topic).toBe('function');
  });
});
