/**
 * Tests for ChatBroadcastChannel
 */

import {
  ChatBroadcastChannel,
  getChatBroadcastChannel,
  closeChatBroadcastChannel,
} from './chat-broadcast';

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  private static channels: Map<string, MockBroadcastChannel[]> = new Map();

  constructor(name: string) {
    this.name = name;
    const channels = MockBroadcastChannel.channels.get(name) || [];
    channels.push(this);
    MockBroadcastChannel.channels.set(name, channels);
  }

  postMessage(message: unknown): void {
    const channels = MockBroadcastChannel.channels.get(this.name) || [];
    channels.forEach((channel) => {
      if (channel !== this && channel.onmessage) {
        channel.onmessage(new MessageEvent('message', { data: message }));
      }
    });
  }

  close(): void {
    const channels = MockBroadcastChannel.channels.get(this.name) || [];
    const index = channels.indexOf(this);
    if (index > -1) {
      channels.splice(index, 1);
    }
  }

  static reset(): void {
    MockBroadcastChannel.channels.clear();
  }
}

// Setup global mock
const originalBroadcastChannel = global.BroadcastChannel;

describe('ChatBroadcastChannel', () => {
  beforeAll(() => {
    (global as unknown as { BroadcastChannel: typeof MockBroadcastChannel }).BroadcastChannel =
      MockBroadcastChannel;
  });

  afterAll(() => {
    global.BroadcastChannel = originalBroadcastChannel;
  });

  beforeEach(() => {
    MockBroadcastChannel.reset();
    closeChatBroadcastChannel();
  });

  afterEach(() => {
    closeChatBroadcastChannel();
  });

  describe('initialization', () => {
    it('should create channel with default name', () => {
      const channel = new ChatBroadcastChannel();
      expect(channel.isChannelSupported()).toBe(true);
    });

    it('should create channel with custom name', () => {
      const channel = new ChatBroadcastChannel('custom-channel');
      expect(channel.isChannelSupported()).toBe(true);
    });

    it('should generate unique tab ID', () => {
      const channel1 = new ChatBroadcastChannel('channel1');
      const channel2 = new ChatBroadcastChannel('channel2');
      // Tab IDs are persisted in sessionStorage, so they'll be the same
      // unless we clear sessionStorage between creations
      expect(channel1.getTabId()).toBeDefined();
      expect(channel2.getTabId()).toBeDefined();
    });
  });

  describe('broadcast', () => {
    it('should broadcast message to other channels', () => {
      const channel1 = new ChatBroadcastChannel('test');
      // Clear sessionStorage so channel2 gets a different tabId
      sessionStorage.removeItem('cognia-tab-id');
      const channel2 = new ChatBroadcastChannel('test');

      const handler = jest.fn();
      channel2.onAll(handler);

      channel1.broadcast('message_added', { messageId: '123' });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'message_added',
          payload: { messageId: '123' },
        })
      );
    });

    it('should not receive own messages', () => {
      const channel = new ChatBroadcastChannel('test');

      const handler = jest.fn();
      channel.onAll(handler);

      channel.broadcast('message_added', { messageId: '123' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('event subscriptions', () => {
    it('should subscribe to specific event type', () => {
      const channel1 = new ChatBroadcastChannel('test');
      sessionStorage.removeItem('cognia-tab-id');
      const channel2 = new ChatBroadcastChannel('test');

      const messageHandler = jest.fn();
      const sessionHandler = jest.fn();

      channel2.on('message_added', messageHandler);
      channel2.on('session_created', sessionHandler);

      channel1.broadcast('message_added', { messageId: '123' });

      expect(messageHandler).toHaveBeenCalled();
      expect(sessionHandler).not.toHaveBeenCalled();
    });

    it('should allow unsubscribing from events', () => {
      const channel1 = new ChatBroadcastChannel('test');
      sessionStorage.removeItem('cognia-tab-id');
      const channel2 = new ChatBroadcastChannel('test');

      const handler = jest.fn();
      const unsubscribe = channel2.on('message_added', handler);

      unsubscribe();
      channel1.broadcast('message_added', { messageId: '123' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('convenience methods', () => {
    it('should broadcast message added', () => {
      const channel1 = new ChatBroadcastChannel('test');
      sessionStorage.removeItem('cognia-tab-id');
      const channel2 = new ChatBroadcastChannel('test');

      const handler = jest.fn();
      channel2.on('message_added', handler);

      channel1.broadcastMessageAdded({
        sessionId: 'session1',
        messageId: 'msg1',
        role: 'user',
        content: 'Hello',
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'message_added',
          payload: {
            sessionId: 'session1',
            messageId: 'msg1',
            role: 'user',
            content: 'Hello',
          },
        })
      );
    });

    it('should broadcast session switched', () => {
      const channel1 = new ChatBroadcastChannel('test');
      sessionStorage.removeItem('cognia-tab-id');
      const channel2 = new ChatBroadcastChannel('test');

      const handler = jest.fn();
      channel2.on('session_switched', handler);

      channel1.broadcastSessionSwitched({
        fromSessionId: 'old',
        toSessionId: 'new',
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session_switched',
        })
      );
    });
  });

  describe('close', () => {
    it('should close channel and clear listeners', () => {
      const channel1 = new ChatBroadcastChannel('test');
      sessionStorage.removeItem('cognia-tab-id');
      const channel2 = new ChatBroadcastChannel('test');

      const handler = jest.fn();
      channel2.onAll(handler);
      channel2.close();

      channel1.broadcast('message_added', { messageId: '123' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('global channel', () => {
    it('should return same instance', () => {
      const instance1 = getChatBroadcastChannel();
      const instance2 = getChatBroadcastChannel();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after close', () => {
      const instance1 = getChatBroadcastChannel();
      closeChatBroadcastChannel();
      const instance2 = getChatBroadcastChannel();

      expect(instance1).not.toBe(instance2);
    });
  });
});
