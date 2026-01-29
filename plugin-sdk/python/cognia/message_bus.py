"""
Message Bus API for Cognia Plugin SDK

Provides pub/sub message bus for event-driven communication.
Offers a centralized event system for decoupled plugin communication.
"""

from abc import ABC, abstractmethod
from typing import Any, Callable, Generic, List, Optional, TypeVar

from .types import (
    MessagePriority,
    SubscriptionOptions,
    MessageMetadata,
    TopicStats,
)

TRequest = TypeVar('TRequest')
TResponse = TypeVar('TResponse')


class MessageBusAPI(ABC):
    """
    Message Bus API for pub/sub communication.
    
    Provides a centralized event bus for plugins to communicate through
    topics. Supports pub/sub, request-response, and broadcast patterns.
    
    Example:
        # Publish an event
        context.bus.publish('user:login', {'user_id': '123', 'timestamp': time.time()})
        
        # Subscribe to events
        unsubscribe = context.bus.subscribe('user:login', lambda data, meta:
            print('User logged in:', data['user_id'])
        )
        
        # Request-response pattern
        response = await context.bus.request('data:fetch', {'id': '123'})
        
        # Respond to requests
        context.bus.respond('data:fetch', lambda data:
            fetch_data(data['id'])
        )
    """
    
    @abstractmethod
    def publish(self, topic: str, data: Any, priority: MessagePriority = MessagePriority.NORMAL, 
                correlation_id: Optional[str] = None) -> None:
        """
        Publish a message to a topic.
        
        Args:
            topic: Topic name to publish to
            data: Data to publish
            priority: Message priority
            correlation_id: Optional correlation ID for tracking
        """
        pass
    
    @abstractmethod
    def subscribe(self, topic: str, handler: Callable[[Any, MessageMetadata], None],
                  options: Optional[SubscriptionOptions] = None) -> Callable[[], None]:
        """
        Subscribe to a topic.
        
        Args:
            topic: Topic name to subscribe to (supports wildcards: 'user:*')
            handler: Handler function called when message is received
            options: Subscription options
            
        Returns:
            Unsubscribe function
        """
        pass
    
    @abstractmethod
    def subscribe_once(self, topic: str, handler: Callable[[Any, MessageMetadata], None],
                       options: Optional[SubscriptionOptions] = None) -> Callable[[], None]:
        """
        Subscribe to a topic for a single message.
        
        Args:
            topic: Topic name to subscribe to
            handler: Handler function called once when message is received
            options: Subscription options
            
        Returns:
            Unsubscribe function
        """
        pass
    
    @abstractmethod
    async def request(self, topic: str, data: Any, timeout: int = 30000) -> Any:
        """
        Make a request and wait for response.
        
        Args:
            topic: Topic to send request to
            data: Request data
            timeout: Timeout in ms (default: 30000)
            
        Returns:
            Response data
        """
        pass
    
    @abstractmethod
    def respond(self, topic: str, handler: Callable[[Any, MessageMetadata], Any]) -> Callable[[], None]:
        """
        Register a handler to respond to requests.
        
        Args:
            topic: Topic to respond to
            handler: Handler function that processes request and returns response
            
        Returns:
            Unsubscribe function
        """
        pass
    
    @abstractmethod
    def has_subscribers(self, topic: str) -> bool:
        """
        Check if a topic has any subscribers.
        
        Args:
            topic: Topic to check
            
        Returns:
            Whether the topic has subscribers
        """
        pass
    
    @abstractmethod
    def get_subscriber_count(self, topic: str) -> int:
        """
        Get number of subscribers for a topic.
        
        Args:
            topic: Topic to query
            
        Returns:
            Number of subscribers
        """
        pass
    
    @abstractmethod
    def get_topic_stats(self, topic: str) -> Optional[TopicStats]:
        """
        Get statistics for a topic.
        
        Args:
            topic: Topic to query
            
        Returns:
            Topic statistics or None
        """
        pass
    
    @abstractmethod
    def get_topics(self) -> List[str]:
        """
        Get all active topics.
        
        Returns:
            Array of topic names
        """
        pass
    
    @abstractmethod
    def clear_subscriptions(self) -> None:
        """Clear all subscriptions for this plugin"""
        pass
    
    @abstractmethod
    def scope(self, prefix: str) -> "MessageBusAPI":
        """
        Create a scoped message bus with topic prefix.
        
        Args:
            prefix: Prefix to add to all topics
            
        Returns:
            Scoped message bus API
            
        Example:
            user_bus = context.bus.scope('user')
            user_bus.publish('login', data)  # Publishes to 'user:login'
            user_bus.subscribe('logout', handler)  # Subscribes to 'user:logout'
        """
        pass


__all__ = [
    "MessageBusAPI",
]
