/**
 * Tests for Message Actions utilities
 */

import {
  editMessage,
  toggleBookmark,
  setReaction,
  setTranslation,
  clearTranslation,
  createBranchFromMessage,
  getBookmarkedMessages,
  searchMessages,
  getMessageStats,
  formatMessageForSharing,
} from './message-actions';
import type { UIMessage } from '@/types';

const createMockMessage = (overrides: Partial<UIMessage> = {}): UIMessage => ({
  id: 'msg-1',
  role: 'user',
  content: 'Hello world',
  createdAt: new Date('2024-01-01T12:00:00Z'),
  ...overrides,
});

describe('editMessage', () => {
  it('updates message content', () => {
    const message = createMockMessage({ content: 'Original' });
    const result = editMessage(message, 'Updated');
    
    expect(result.content).toBe('Updated');
  });

  it('marks message as edited', () => {
    const message = createMockMessage();
    const result = editMessage(message, 'New content');
    
    expect(result.isEdited).toBe(true);
  });

  it('preserves original content', () => {
    const message = createMockMessage({ content: 'Original' });
    const result = editMessage(message, 'New');
    
    expect(result.originalContent).toBe('Original');
  });

  it('adds to edit history', () => {
    const message = createMockMessage({ content: 'Original' });
    const result = editMessage(message, 'First edit');
    
    expect(result.editHistory).toHaveLength(1);
    expect(result.editHistory![0].content).toBe('Original');
  });

  it('accumulates edit history', () => {
    const message = createMockMessage({ 
      content: 'Second',
      editHistory: [{ content: 'First', editedAt: new Date() }]
    });
    const result = editMessage(message, 'Third');
    
    expect(result.editHistory).toHaveLength(2);
  });

  it('preserves message id', () => {
    const message = createMockMessage({ id: 'test-id' });
    const result = editMessage(message, 'New');
    
    expect(result.id).toBe('test-id');
  });

  it('preserves other message properties', () => {
    const message = createMockMessage({ 
      role: 'assistant',
      model: 'gpt-4',
    });
    const result = editMessage(message, 'New');
    
    expect(result.role).toBe('assistant');
    expect(result.model).toBe('gpt-4');
  });
});

describe('toggleBookmark', () => {
  it('bookmarks unbookmarked message', () => {
    const message = createMockMessage({ isBookmarked: false });
    const result = toggleBookmark(message);
    
    expect(result.isBookmarked).toBe(true);
    expect(result.bookmarkedAt).toBeDefined();
  });

  it('unbookmarks bookmarked message', () => {
    const message = createMockMessage({ 
      isBookmarked: true, 
      bookmarkedAt: new Date() 
    });
    const result = toggleBookmark(message);
    
    expect(result.isBookmarked).toBe(false);
    expect(result.bookmarkedAt).toBeUndefined();
  });

  it('preserves message content', () => {
    const message = createMockMessage({ content: 'Test content' });
    const result = toggleBookmark(message);
    
    expect(result.content).toBe('Test content');
  });
});

describe('setReaction', () => {
  it('sets reaction on message', () => {
    const message = createMockMessage();
    const result = setReaction(message, 'like');
    
    expect(result.reaction).toBe('like');
  });

  it('clears reaction when null', () => {
    const message = createMockMessage({ reaction: 'like' });
    const result = setReaction(message, null);
    
    expect(result.reaction).toBeUndefined();
  });

  it('replaces existing reaction', () => {
    const message = createMockMessage({ reaction: 'like' });
    const result = setReaction(message, 'dislike');
    
    expect(result.reaction).toBe('dislike');
  });

  it('preserves message content', () => {
    const message = createMockMessage({ content: 'Test' });
    const result = setReaction(message, 'like');
    
    expect(result.content).toBe('Test');
  });
});

describe('setTranslation', () => {
  it('sets translated content', () => {
    const message = createMockMessage();
    const result = setTranslation(message, 'Hola mundo', 'es');
    
    expect(result.translatedContent).toBe('Hola mundo');
    expect(result.translatedTo).toBe('es');
  });

  it('replaces existing translation', () => {
    const message = createMockMessage({ 
      translatedContent: 'Old', 
      translatedTo: 'fr' 
    });
    const result = setTranslation(message, 'New', 'de');
    
    expect(result.translatedContent).toBe('New');
    expect(result.translatedTo).toBe('de');
  });

  it('preserves original content', () => {
    const message = createMockMessage({ content: 'Hello' });
    const result = setTranslation(message, 'Hola', 'es');
    
    expect(result.content).toBe('Hello');
  });
});

describe('clearTranslation', () => {
  it('removes translation', () => {
    const message = createMockMessage({ 
      translatedContent: 'Hola', 
      translatedTo: 'es' 
    });
    const result = clearTranslation(message);
    
    expect(result.translatedContent).toBeUndefined();
    expect(result.translatedTo).toBeUndefined();
  });

  it('handles message without translation', () => {
    const message = createMockMessage();
    const result = clearTranslation(message);
    
    expect(result.translatedContent).toBeUndefined();
    expect(result.translatedTo).toBeUndefined();
  });
});

describe('createBranchFromMessage', () => {
  it('creates branch with correct id', () => {
    const message = createMockMessage({ id: 'parent-id' });
    const result = createBranchFromMessage(message, 'branch-123');
    
    expect(result.branchId).toBe('branch-123');
    expect(result.parentMessageId).toBe('parent-id');
  });

  it('preserves message content', () => {
    const message = createMockMessage({ content: 'Original' });
    const result = createBranchFromMessage(message, 'branch-1');
    
    expect(result.content).toBe('Original');
  });
});

describe('getBookmarkedMessages', () => {
  it('returns only bookmarked messages', () => {
    const messages: UIMessage[] = [
      createMockMessage({ id: '1', isBookmarked: true }),
      createMockMessage({ id: '2', isBookmarked: false }),
      createMockMessage({ id: '3', isBookmarked: true }),
    ];
    
    const result = getBookmarkedMessages(messages);
    
    expect(result).toHaveLength(2);
    expect(result.map(m => m.id)).toEqual(['1', '3']);
  });

  it('returns empty array when no bookmarks', () => {
    const messages: UIMessage[] = [
      createMockMessage({ isBookmarked: false }),
      createMockMessage({ isBookmarked: false }),
    ];
    
    const result = getBookmarkedMessages(messages);
    
    expect(result).toHaveLength(0);
  });

  it('handles empty array', () => {
    const result = getBookmarkedMessages([]);
    
    expect(result).toHaveLength(0);
  });
});

describe('searchMessages', () => {
  it('finds messages by content', () => {
    const messages: UIMessage[] = [
      createMockMessage({ id: '1', content: 'Hello world' }),
      createMockMessage({ id: '2', content: 'Goodbye world' }),
      createMockMessage({ id: '3', content: 'Hello there' }),
    ];
    
    const result = searchMessages(messages, 'Hello');
    
    expect(result).toHaveLength(2);
    expect(result.map(m => m.id)).toEqual(['1', '3']);
  });

  it('is case insensitive', () => {
    const messages: UIMessage[] = [
      createMockMessage({ id: '1', content: 'HELLO world' }),
      createMockMessage({ id: '2', content: 'hello there' }),
    ];
    
    const result = searchMessages(messages, 'Hello');
    
    expect(result).toHaveLength(2);
  });

  it('searches translated content', () => {
    const messages: UIMessage[] = [
      createMockMessage({ id: '1', content: 'Hello', translatedContent: 'Hola mundo' }),
      createMockMessage({ id: '2', content: 'Goodbye' }),
    ];
    
    const result = searchMessages(messages, 'Hola');
    
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('returns empty array for no matches', () => {
    const messages: UIMessage[] = [
      createMockMessage({ content: 'Hello world' }),
    ];
    
    const result = searchMessages(messages, 'xyz');
    
    expect(result).toHaveLength(0);
  });

  it('handles empty query', () => {
    const messages: UIMessage[] = [
      createMockMessage({ id: '1', content: 'Hello' }),
    ];
    
    const result = searchMessages(messages, '');
    
    expect(result).toHaveLength(1);
  });
});

describe('getMessageStats', () => {
  it('returns correct total count', () => {
    const messages: UIMessage[] = [
      createMockMessage(),
      createMockMessage(),
      createMockMessage(),
    ];
    
    const stats = getMessageStats(messages);
    
    expect(stats.total).toBe(3);
  });

  it('counts user messages', () => {
    const messages: UIMessage[] = [
      createMockMessage({ role: 'user' }),
      createMockMessage({ role: 'assistant' }),
      createMockMessage({ role: 'user' }),
    ];
    
    const stats = getMessageStats(messages);
    
    expect(stats.userMessages).toBe(2);
  });

  it('counts assistant messages', () => {
    const messages: UIMessage[] = [
      createMockMessage({ role: 'user' }),
      createMockMessage({ role: 'assistant' }),
      createMockMessage({ role: 'assistant' }),
    ];
    
    const stats = getMessageStats(messages);
    
    expect(stats.assistantMessages).toBe(2);
  });

  it('counts bookmarked messages', () => {
    const messages: UIMessage[] = [
      createMockMessage({ isBookmarked: true }),
      createMockMessage({ isBookmarked: false }),
      createMockMessage({ isBookmarked: true }),
    ];
    
    const stats = getMessageStats(messages);
    
    expect(stats.bookmarked).toBe(2);
  });

  it('counts edited messages', () => {
    const messages: UIMessage[] = [
      createMockMessage({ isEdited: true }),
      createMockMessage({ isEdited: false }),
    ];
    
    const stats = getMessageStats(messages);
    
    expect(stats.edited).toBe(1);
  });

  it('counts messages with reactions', () => {
    const messages: UIMessage[] = [
      createMockMessage({ reaction: 'like' }),
      createMockMessage({ reaction: undefined }),
      createMockMessage({ reaction: 'dislike' }),
    ];
    
    const stats = getMessageStats(messages);
    
    expect(stats.withReactions).toBe(2);
  });

  it('handles empty array', () => {
    const stats = getMessageStats([]);
    
    expect(stats.total).toBe(0);
    expect(stats.userMessages).toBe(0);
    expect(stats.assistantMessages).toBe(0);
  });
});

describe('formatMessageForSharing', () => {
  it('formats user message correctly', () => {
    const message = createMockMessage({ 
      role: 'user', 
      content: 'Hello',
      createdAt: new Date('2024-01-01T12:00:00Z')
    });
    
    const result = formatMessageForSharing(message);
    
    expect(result).toContain('You');
    expect(result).toContain('Hello');
  });

  it('formats assistant message correctly', () => {
    const message = createMockMessage({ 
      role: 'assistant', 
      content: 'Hi there' 
    });
    
    const result = formatMessageForSharing(message);
    
    expect(result).toContain('Assistant');
    expect(result).toContain('Hi there');
  });

  it('includes timestamp', () => {
    const message = createMockMessage({
      createdAt: new Date('2024-01-01T12:00:00Z')
    });
    
    const result = formatMessageForSharing(message);
    
    expect(result).toMatch(/\d/);
  });

  it('handles multi-line content', () => {
    const message = createMockMessage({ content: 'Line 1\nLine 2' });
    
    const result = formatMessageForSharing(message);
    
    expect(result).toContain('Line 1\nLine 2');
  });
});
