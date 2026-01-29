/**
 * Message Bus API Tests
 *
 * @description Tests for message bus API type definitions.
 */

import type {
  MessagePriority,
  SubscriptionOptions,
  MessageMetadata,
  MessageEnvelope,
  TopicStats,
  RequestHandler,
  PluginMessageBusAPI,
} from './message-bus';

describe('Message Bus API Types', () => {
  describe('MessagePriority', () => {
    it('should support all priority levels', () => {
      const priorities: MessagePriority[] = ['high', 'normal', 'low'];

      expect(priorities).toContain('high');
      expect(priorities).toContain('normal');
      expect(priorities).toContain('low');
      expect(priorities).toHaveLength(3);
    });
  });

  describe('SubscriptionOptions', () => {
    it('should create options with priority', () => {
      const opts: SubscriptionOptions = {
        priority: 'high',
      };

      expect(opts.priority).toBe('high');
    });

    it('should create options with filter function', () => {
      const opts: SubscriptionOptions = {
        filter: (data) => (data as { type: string }).type === 'important',
      };

      expect(opts.filter).toBeDefined();
      expect(opts.filter!({ type: 'important' })).toBe(true);
      expect(opts.filter!({ type: 'normal' })).toBe(false);
    });

    it('should create options with max messages', () => {
      const opts: SubscriptionOptions = {
        maxMessages: 10,
      };

      expect(opts.maxMessages).toBe(10);
    });

    it('should create options with timeout', () => {
      const opts: SubscriptionOptions = {
        timeout: 30000,
      };

      expect(opts.timeout).toBe(30000);
    });

    it('should create options with all properties', () => {
      const opts: SubscriptionOptions = {
        priority: 'normal',
        filter: (data) => Boolean(data),
        maxMessages: 5,
        timeout: 60000,
      };

      expect(opts.priority).toBe('normal');
      expect(opts.maxMessages).toBe(5);
      expect(opts.timeout).toBe(60000);
    });
  });

  describe('MessageMetadata', () => {
    it('should create basic metadata', () => {
      const meta: MessageMetadata = {
        id: 'msg-123',
        topic: 'user:login',
        publisherId: 'auth-plugin',
        timestamp: Date.now(),
        priority: 'normal',
      };

      expect(meta.id).toBe('msg-123');
      expect(meta.topic).toBe('user:login');
      expect(meta.publisherId).toBe('auth-plugin');
      expect(meta.priority).toBe('normal');
    });

    it('should create metadata with correlation ID', () => {
      const meta: MessageMetadata = {
        id: 'msg-456',
        topic: 'data:response',
        publisherId: 'data-plugin',
        timestamp: Date.now(),
        priority: 'high',
        correlationId: 'req-789',
      };

      expect(meta.correlationId).toBe('req-789');
    });
  });

  describe('MessageEnvelope', () => {
    it('should create a message envelope', () => {
      const envelope: MessageEnvelope<{ userId: string }> = {
        data: { userId: '123' },
        metadata: {
          id: 'msg-1',
          topic: 'user:action',
          publisherId: 'my-plugin',
          timestamp: Date.now(),
          priority: 'normal',
        },
      };

      expect(envelope.data.userId).toBe('123');
      expect(envelope.metadata.topic).toBe('user:action');
    });

    it('should create envelope with complex data', () => {
      interface EventData {
        type: string;
        payload: {
          items: number[];
          metadata: Record<string, string>;
        };
      }

      const envelope: MessageEnvelope<EventData> = {
        data: {
          type: 'batch-update',
          payload: {
            items: [1, 2, 3],
            metadata: { source: 'api' },
          },
        },
        metadata: {
          id: 'msg-2',
          topic: 'batch:update',
          publisherId: 'batch-plugin',
          timestamp: Date.now(),
          priority: 'high',
        },
      };

      expect(envelope.data.type).toBe('batch-update');
      expect(envelope.data.payload.items).toHaveLength(3);
    });
  });

  describe('TopicStats', () => {
    it('should create topic statistics', () => {
      const stats: TopicStats = {
        topic: 'user:events',
        subscriberCount: 5,
        messageCount: 100,
        lastMessageAt: new Date(),
      };

      expect(stats.topic).toBe('user:events');
      expect(stats.subscriberCount).toBe(5);
      expect(stats.messageCount).toBe(100);
      expect(stats.lastMessageAt).toBeDefined();
    });

    it('should create stats without last message time', () => {
      const stats: TopicStats = {
        topic: 'new:topic',
        subscriberCount: 1,
        messageCount: 0,
      };

      expect(stats.messageCount).toBe(0);
      expect(stats.lastMessageAt).toBeUndefined();
    });
  });

  describe('RequestHandler', () => {
    it('should define a sync request handler', () => {
      const handler: RequestHandler<{ id: string }, { data: string }> = (data, metadata) => {
        return { data: `Result for ${data.id}` };
      };

      const result = handler({ id: '123' }, {
        id: 'msg-1',
        topic: 'data:fetch',
        publisherId: 'requester',
        timestamp: Date.now(),
        priority: 'normal',
      });

      expect(result).toEqual({ data: 'Result for 123' });
    });

    it('should define an async request handler', async () => {
      const handler: RequestHandler<string, number> = async (data, metadata) => {
        return data.length;
      };

      const result = await handler('hello', {
        id: 'msg-2',
        topic: 'string:length',
        publisherId: 'caller',
        timestamp: Date.now(),
        priority: 'low',
      });

      expect(result).toBe(5);
    });
  });

  describe('PluginMessageBusAPI', () => {
    it('should define all required API methods', () => {
      const mockAPI: PluginMessageBusAPI = {
        publish: jest.fn(),
        subscribe: jest.fn(),
        subscribeOnce: jest.fn(),
        request: jest.fn(),
        respond: jest.fn(),
        hasSubscribers: jest.fn(),
        getSubscriberCount: jest.fn(),
        getTopicStats: jest.fn(),
        getTopics: jest.fn(),
        clearSubscriptions: jest.fn(),
        scope: jest.fn(),
      };

      expect(mockAPI.publish).toBeDefined();
      expect(mockAPI.subscribe).toBeDefined();
      expect(mockAPI.subscribeOnce).toBeDefined();
      expect(mockAPI.request).toBeDefined();
      expect(mockAPI.respond).toBeDefined();
      expect(mockAPI.hasSubscribers).toBeDefined();
      expect(mockAPI.getSubscriberCount).toBeDefined();
      expect(mockAPI.getTopicStats).toBeDefined();
      expect(mockAPI.getTopics).toBeDefined();
      expect(mockAPI.clearSubscriptions).toBeDefined();
      expect(mockAPI.scope).toBeDefined();
    });

    it('should publish messages', () => {
      const mockAPI: PluginMessageBusAPI = {
        publish: jest.fn(),
        subscribe: jest.fn(),
        subscribeOnce: jest.fn(),
        request: jest.fn(),
        respond: jest.fn(),
        hasSubscribers: jest.fn(),
        getSubscriberCount: jest.fn(),
        getTopicStats: jest.fn(),
        getTopics: jest.fn(),
        clearSubscriptions: jest.fn(),
        scope: jest.fn(),
      };

      mockAPI.publish('user:login', { userId: '123', timestamp: Date.now() });
      expect(mockAPI.publish).toHaveBeenCalledWith('user:login', expect.any(Object));

      mockAPI.publish('priority:message', { data: 'urgent' }, { priority: 'high' });
      expect(mockAPI.publish).toHaveBeenCalledWith(
        'priority:message',
        { data: 'urgent' },
        { priority: 'high' }
      );

      mockAPI.publish('correlated:msg', { data: 'test' }, { correlationId: 'req-1' });
      expect(mockAPI.publish).toHaveBeenCalledWith(
        'correlated:msg',
        { data: 'test' },
        { correlationId: 'req-1' }
      );
    });

    it('should subscribe to topics', () => {
      const subscriptions: Record<string, (data: unknown, metadata: MessageMetadata) => void> = {};
      const mockAPI: PluginMessageBusAPI = {
        publish: jest.fn(),
        subscribe: jest.fn().mockImplementation((topic, handler, options) => {
          subscriptions[topic] = handler;
          return () => delete subscriptions[topic];
        }),
        subscribeOnce: jest.fn().mockImplementation((topic, handler, options) => {
          const wrappedHandler = (data: unknown, metadata: MessageMetadata) => {
            handler(data, metadata);
            delete subscriptions[topic];
          };
          subscriptions[topic] = wrappedHandler;
          return () => delete subscriptions[topic];
        }),
        request: jest.fn(),
        respond: jest.fn(),
        hasSubscribers: jest.fn(),
        getSubscriberCount: jest.fn(),
        getTopicStats: jest.fn(),
        getTopics: jest.fn(),
        clearSubscriptions: jest.fn(),
        scope: jest.fn(),
      };

      const unsubscribe = mockAPI.subscribe<{ userId: string }>(
        'user:login',
        (data, metadata) => {
          expect(data.userId).toBeDefined();
        },
        { priority: 'high' }
      );

      expect(mockAPI.subscribe).toHaveBeenCalledWith(
        'user:login',
        expect.any(Function),
        { priority: 'high' }
      );
      expect(typeof unsubscribe).toBe('function');

      const unsubOnce = mockAPI.subscribeOnce('one-time', () => {});
      expect(typeof unsubOnce).toBe('function');
    });

    it('should handle request-response pattern', async () => {
      const mockAPI: PluginMessageBusAPI = {
        publish: jest.fn(),
        subscribe: jest.fn(),
        subscribeOnce: jest.fn(),
        request: jest.fn().mockResolvedValue({ result: 'data' }),
        respond: jest.fn().mockReturnValue(() => {}),
        hasSubscribers: jest.fn(),
        getSubscriberCount: jest.fn(),
        getTopicStats: jest.fn(),
        getTopics: jest.fn(),
        clearSubscriptions: jest.fn(),
        scope: jest.fn(),
      };

      const response = await mockAPI.request<{ id: string }, { result: string }>(
        'data:fetch',
        { id: '123' },
        5000
      );

      expect(response).toEqual({ result: 'data' });
      expect(mockAPI.request).toHaveBeenCalledWith('data:fetch', { id: '123' }, 5000);

      const unsubscribe = mockAPI.respond<{ id: string }, { data: string }>(
        'data:fetch',
        async (data, metadata) => ({ data: `Result for ${data.id}` })
      );

      expect(mockAPI.respond).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should check subscriber status', () => {
      const mockAPI: PluginMessageBusAPI = {
        publish: jest.fn(),
        subscribe: jest.fn(),
        subscribeOnce: jest.fn(),
        request: jest.fn(),
        respond: jest.fn(),
        hasSubscribers: jest.fn().mockImplementation((topic) => topic === 'active:topic'),
        getSubscriberCount: jest.fn().mockImplementation((topic) => {
          if (topic === 'active:topic') return 3;
          if (topic === 'another:topic') return 1;
          return 0;
        }),
        getTopicStats: jest.fn(),
        getTopics: jest.fn(),
        clearSubscriptions: jest.fn(),
        scope: jest.fn(),
      };

      expect(mockAPI.hasSubscribers('active:topic')).toBe(true);
      expect(mockAPI.hasSubscribers('empty:topic')).toBe(false);

      expect(mockAPI.getSubscriberCount('active:topic')).toBe(3);
      expect(mockAPI.getSubscriberCount('another:topic')).toBe(1);
      expect(mockAPI.getSubscriberCount('empty:topic')).toBe(0);
    });

    it('should get topic statistics', () => {
      const mockAPI: PluginMessageBusAPI = {
        publish: jest.fn(),
        subscribe: jest.fn(),
        subscribeOnce: jest.fn(),
        request: jest.fn(),
        respond: jest.fn(),
        hasSubscribers: jest.fn(),
        getSubscriberCount: jest.fn(),
        getTopicStats: jest.fn().mockImplementation((topic) => {
          if (topic === 'user:events') {
            return {
              topic: 'user:events',
              subscriberCount: 5,
              messageCount: 100,
              lastMessageAt: new Date(),
            };
          }
          return null;
        }),
        getTopics: jest.fn().mockReturnValue(['user:events', 'data:sync', 'system:health']),
        clearSubscriptions: jest.fn(),
        scope: jest.fn(),
      };

      const stats = mockAPI.getTopicStats('user:events');
      expect(stats).not.toBeNull();
      expect(stats!.subscriberCount).toBe(5);

      const noStats = mockAPI.getTopicStats('unknown:topic');
      expect(noStats).toBeNull();

      const topics = mockAPI.getTopics();
      expect(topics).toContain('user:events');
      expect(topics).toHaveLength(3);
    });

    it('should clear subscriptions', () => {
      const mockAPI: PluginMessageBusAPI = {
        publish: jest.fn(),
        subscribe: jest.fn(),
        subscribeOnce: jest.fn(),
        request: jest.fn(),
        respond: jest.fn(),
        hasSubscribers: jest.fn(),
        getSubscriberCount: jest.fn(),
        getTopicStats: jest.fn(),
        getTopics: jest.fn(),
        clearSubscriptions: jest.fn(),
        scope: jest.fn(),
      };

      mockAPI.clearSubscriptions();
      expect(mockAPI.clearSubscriptions).toHaveBeenCalled();
    });

    it('should create scoped message bus', () => {
      const mockScopedAPI: PluginMessageBusAPI = {
        publish: jest.fn(),
        subscribe: jest.fn(),
        subscribeOnce: jest.fn(),
        request: jest.fn(),
        respond: jest.fn(),
        hasSubscribers: jest.fn(),
        getSubscriberCount: jest.fn(),
        getTopicStats: jest.fn(),
        getTopics: jest.fn(),
        clearSubscriptions: jest.fn(),
        scope: jest.fn(),
      };

      const mockAPI: PluginMessageBusAPI = {
        publish: jest.fn(),
        subscribe: jest.fn(),
        subscribeOnce: jest.fn(),
        request: jest.fn(),
        respond: jest.fn(),
        hasSubscribers: jest.fn(),
        getSubscriberCount: jest.fn(),
        getTopicStats: jest.fn(),
        getTopics: jest.fn(),
        clearSubscriptions: jest.fn(),
        scope: jest.fn().mockReturnValue(mockScopedAPI),
      };

      const userBus = mockAPI.scope('user');
      expect(mockAPI.scope).toHaveBeenCalledWith('user');
      expect(userBus).toBe(mockScopedAPI);

      userBus.publish('login', { userId: '123' });
      expect(mockScopedAPI.publish).toHaveBeenCalledWith('login', { userId: '123' });
    });

    it('should support wildcard subscriptions', () => {
      const handlers: Record<string, (data: unknown, metadata: MessageMetadata) => void> = {};
      const mockAPI: PluginMessageBusAPI = {
        publish: jest.fn(),
        subscribe: jest.fn().mockImplementation((topic, handler) => {
          handlers[topic] = handler;
          return () => delete handlers[topic];
        }),
        subscribeOnce: jest.fn(),
        request: jest.fn(),
        respond: jest.fn(),
        hasSubscribers: jest.fn(),
        getSubscriberCount: jest.fn(),
        getTopicStats: jest.fn(),
        getTopics: jest.fn(),
        clearSubscriptions: jest.fn(),
        scope: jest.fn(),
      };

      mockAPI.subscribe('user:*', (data, metadata) => {
        expect(metadata.topic.startsWith('user:')).toBe(true);
      });

      expect(mockAPI.subscribe).toHaveBeenCalledWith('user:*', expect.any(Function));
      expect(handlers['user:*']).toBeDefined();
    });
  });
});
