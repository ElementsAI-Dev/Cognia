/**
 * AI Conversation Tests
 */

jest.mock('ai', () => ({
  streamText: jest.fn(),
}));

jest.mock('@/lib/ai/core/client', () => ({
  getProviderModel: jest.fn(() => ({ id: 'mock-model' })),
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-id-123'),
}));

jest.mock('./ai', () => ({
  cleanAICodeResponse: jest.fn((code: string) => code),
  continueDesignConversation: jest.fn().mockResolvedValue({
    success: true,
    response: 'AI response',
    code: 'new code',
  }),
}));

import {
  createConversation,
  addUserMessage,
  continueConversation,
} from './ai-conversation';

import type { DesignerAIConfig } from './ai';

const mockConfig: DesignerAIConfig = {
  provider: 'openai',
  model: 'gpt-4',
  apiKey: 'test-api-key',
};

describe('AI Conversation', () => {
  describe('createConversation', () => {
    it('should create a new conversation', () => {
      const conversation = createConversation('designer-1', 'initial code', mockConfig);

      expect(conversation.id).toBe('mock-id-123');
      expect(conversation.designerId).toBe('designer-1');
      expect(conversation.currentCode).toBe('initial code');
      expect(conversation.messages).toEqual([]);
      expect(conversation.metadata.model).toBe('gpt-4');
      expect(conversation.metadata.provider).toBe('openai');
    });

    it('should initialize with zero total tokens', () => {
      const conversation = createConversation('designer-1', 'code', mockConfig);

      expect(conversation.metadata.totalTokens).toBe(0);
    });

    it('should set creation and update timestamps', () => {
      const before = new Date();
      const conversation = createConversation('designer-1', 'code', mockConfig);
      const after = new Date();

      expect(conversation.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(conversation.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(conversation.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('addUserMessage', () => {
    it('should add user message to conversation', () => {
      const conversation = createConversation('d1', 'code', mockConfig);
      
      const updated = addUserMessage(conversation, 'Hello');

      expect(updated.messages).toHaveLength(1);
      expect(updated.messages[0].role).toBe('user');
      expect(updated.messages[0].content).toBe('Hello');
    });

    it('should assign unique ID to message', () => {
      const conversation = createConversation('d1', 'code', mockConfig);
      
      const updated = addUserMessage(conversation, 'Test');

      expect(updated.messages[0].id).toBeDefined();
    });

    it('should set timestamp on message', () => {
      const conversation = createConversation('d1', 'code', mockConfig);
      const before = new Date();
      
      const updated = addUserMessage(conversation, 'Test');
      
      expect(updated.messages[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should update conversation updatedAt', () => {
      const conversation = createConversation('d1', 'code', mockConfig);
      const originalUpdatedAt = conversation.updatedAt;
      
      const updated = addUserMessage(conversation, 'Test');

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should preserve existing messages', () => {
      let conversation = createConversation('d1', 'code', mockConfig);
      conversation = addUserMessage(conversation, 'First');
      conversation = addUserMessage(conversation, 'Second');
      conversation = addUserMessage(conversation, 'Third');

      expect(conversation.messages).toHaveLength(3);
      expect(conversation.messages[0].content).toBe('First');
      expect(conversation.messages[1].content).toBe('Second');
      expect(conversation.messages[2].content).toBe('Third');
    });
  });

  describe('continueConversation', () => {
    it('should continue conversation with user message', async () => {
      const conversation = createConversation('d1', 'code', mockConfig);
      
      const result = await continueConversation(conversation, 'Change the color', mockConfig);

      expect(result.success).toBe(true);
      expect(result.conversation).toBeDefined();
    });
  });
});
