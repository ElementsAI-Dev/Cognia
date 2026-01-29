"""
Testing Utilities for Cognia Plugin SDK

Provides mock utilities and test helpers for testing plugins.
Includes mock contexts, test runners, and assertion helpers.
"""

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, TypeVar
from unittest.mock import MagicMock

from .types import PluginContext, ToolContext


T = TypeVar('T')


@dataclass
class MockLogger:
    """Mock logger that captures log calls"""
    logs: List[Dict[str, Any]] = field(default_factory=list)
    
    def debug(self, message: str, *args) -> None:
        self.logs.append({'level': 'debug', 'message': message, 'args': list(args)})
    
    def info(self, message: str, *args) -> None:
        self.logs.append({'level': 'info', 'message': message, 'args': list(args)})
    
    def warn(self, message: str, *args) -> None:
        self.logs.append({'level': 'warn', 'message': message, 'args': list(args)})
    
    def error(self, message: str, *args) -> None:
        self.logs.append({'level': 'error', 'message': message, 'args': list(args)})
    
    def clear(self) -> None:
        """Clear all logs"""
        self.logs.clear()
    
    def get_by_level(self, level: str) -> List[Dict[str, Any]]:
        """Get logs by level"""
        return [log for log in self.logs if log['level'] == level]


@dataclass
class MockStorage:
    """Mock storage that uses in-memory dict"""
    data: Dict[str, Any] = field(default_factory=dict)
    
    async def get(self, key: str) -> Optional[Any]:
        return self.data.get(key)
    
    async def set(self, key: str, value: Any) -> None:
        self.data[key] = value
    
    async def delete(self, key: str) -> None:
        self.data.pop(key, None)
    
    async def keys(self) -> List[str]:
        return list(self.data.keys())
    
    async def clear(self) -> None:
        self.data.clear()


@dataclass
class MockEventEmitter:
    """Mock event emitter that captures events"""
    emitted_events: List[Dict[str, Any]] = field(default_factory=list)
    handlers: Dict[str, List[Callable]] = field(default_factory=dict)
    
    def on(self, event: str, handler: Callable) -> Callable[[], None]:
        if event not in self.handlers:
            self.handlers[event] = []
        self.handlers[event].append(handler)
        return lambda: self.handlers[event].remove(handler) if handler in self.handlers.get(event, []) else None
    
    def off(self, event: str, handler: Callable) -> None:
        if event in self.handlers and handler in self.handlers[event]:
            self.handlers[event].remove(handler)
    
    def emit(self, event: str, *args) -> None:
        self.emitted_events.append({'event': event, 'args': list(args)})
        for handler in self.handlers.get(event, []):
            handler(*args)
    
    def once(self, event: str, handler: Callable) -> Callable[[], None]:
        def wrapped_handler(*args):
            handler(*args)
            self.off(event, wrapped_handler)
        return self.on(event, wrapped_handler)
    
    def clear(self) -> None:
        self.emitted_events.clear()
        self.handlers.clear()
    
    def get_events(self, event: str) -> List[List[Any]]:
        return [e['args'] for e in self.emitted_events if e['event'] == event]


@dataclass
class MockSettings:
    """Mock settings API"""
    settings: Dict[str, Any] = field(default_factory=dict)
    listeners: Dict[str, List[Callable]] = field(default_factory=dict)
    
    def get(self, key: str) -> Optional[Any]:
        return self.settings.get(key)
    
    def set(self, key: str, value: Any) -> None:
        self.settings[key] = value
        for handler in self.listeners.get(key, []):
            handler(value)
    
    def on_change(self, key: str, handler: Callable[[Any], None]) -> Callable[[], None]:
        if key not in self.listeners:
            self.listeners[key] = []
        self.listeners[key].append(handler)
        return lambda: self.listeners[key].remove(handler) if handler in self.listeners.get(key, []) else None


@dataclass
class MockContextOptions:
    """Options for creating mock context"""
    plugin_id: str = "test-plugin"
    plugin_path: str = "/test/plugins/test-plugin"
    config: Dict[str, Any] = field(default_factory=dict)
    storage_data: Dict[str, Any] = field(default_factory=dict)
    settings: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MockPluginContext:
    """Mock plugin context with all mocked APIs"""
    plugin_id: str
    plugin_path: str
    config: Dict[str, Any]
    logger: MockLogger
    storage: MockStorage
    events: MockEventEmitter
    settings: MockSettings
    
    # Additional mock APIs
    ui: Any = field(default_factory=MagicMock)
    a2ui: Any = field(default_factory=MagicMock)
    agent: Any = field(default_factory=MagicMock)
    network: Any = field(default_factory=MagicMock)
    fs: Any = field(default_factory=MagicMock)
    clipboard: Any = field(default_factory=MagicMock)
    shell: Any = field(default_factory=MagicMock)
    db: Any = field(default_factory=MagicMock)
    shortcuts: Any = field(default_factory=MagicMock)
    context_menu: Any = field(default_factory=MagicMock)
    window: Any = field(default_factory=MagicMock)
    secrets: Any = field(default_factory=MagicMock)
    
    def reset(self) -> None:
        """Reset all mocks"""
        self.logger.clear()
        self.storage.data.clear()
        self.events.clear()


def create_mock_logger() -> MockLogger:
    """Create a mock logger"""
    return MockLogger()


def create_mock_storage(initial_data: Optional[Dict[str, Any]] = None) -> MockStorage:
    """Create a mock storage"""
    return MockStorage(data=initial_data or {})


def create_mock_event_emitter() -> MockEventEmitter:
    """Create a mock event emitter"""
    return MockEventEmitter()


def create_mock_settings(initial_settings: Optional[Dict[str, Any]] = None) -> MockSettings:
    """Create a mock settings API"""
    return MockSettings(settings=initial_settings or {})


def create_mock_context(options: Optional[MockContextOptions] = None) -> MockPluginContext:
    """
    Create a mock plugin context for testing.
    
    Args:
        options: Context options
        
    Returns:
        Mock plugin context
        
    Example:
        context = create_mock_context(MockContextOptions(
            plugin_id='test-plugin',
            storage_data={'key': 'value'},
        ))
        
        # Use in tests
        result = await my_plugin.activate(context)
        
        # Check logs
        assert any(log['message'] == 'Plugin activated!' for log in context.logger.logs)
    """
    opts = options or MockContextOptions()
    
    return MockPluginContext(
        plugin_id=opts.plugin_id,
        plugin_path=opts.plugin_path,
        config=opts.config,
        logger=create_mock_logger(),
        storage=create_mock_storage(opts.storage_data),
        events=create_mock_event_emitter(),
        settings=create_mock_settings(opts.settings),
    )


def create_mock_tool_context(overrides: Optional[Dict[str, Any]] = None) -> ToolContext:
    """
    Create a mock tool context.
    
    Args:
        overrides: Optional overrides for context fields
        
    Returns:
        Mock tool context
    """
    defaults = {
        'session_id': 'test-session',
        'message_id': 'test-message',
        'config': {},
    }
    if overrides:
        defaults.update(overrides)
    
    return ToolContext(**defaults)


async def test_tool(tool_def: Any, args: Dict[str, Any], context: Optional[ToolContext] = None) -> Any:
    """
    Test a tool definition.
    
    Args:
        tool_def: Tool definition with execute method
        args: Arguments to pass to the tool
        context: Optional tool context
        
    Returns:
        Tool execution result
        
    Example:
        result = await test_tool(my_tool, {'query': 'test'})
        assert result['success'] == True
    """
    tool_context = context or create_mock_tool_context()
    
    if hasattr(tool_def, 'execute'):
        return await tool_def.execute(args, tool_context)
    elif callable(tool_def):
        return await tool_def(args, tool_context)
    else:
        raise ValueError("Tool definition must have an execute method or be callable")


async def test_hook(hooks: Any, hook_name: str, *args) -> Any:
    """
    Test a hook.
    
    Args:
        hooks: Plugin hooks object
        hook_name: Name of hook to test
        args: Arguments to pass to hook
        
    Returns:
        Hook result
        
    Example:
        await test_hook(my_hooks, 'on_agent_step', 'agent-1', {'type': 'thinking'})
    """
    hook = getattr(hooks, hook_name, None)
    if hook is None:
        return None
    
    if callable(hook):
        result = hook(*args)
        # Handle async hooks
        if hasattr(result, '__await__'):
            return await result
        return result
    
    return None


@dataclass
class Spy:
    """Spy function that tracks calls"""
    calls: List[Dict[str, Any]] = field(default_factory=list)
    implementation: Optional[Callable] = None
    
    def __call__(self, *args, **kwargs) -> Any:
        result = self.implementation(*args, **kwargs) if self.implementation else None
        self.calls.append({'args': list(args), 'kwargs': kwargs, 'result': result})
        return result
    
    @property
    def call_count(self) -> int:
        return len(self.calls)
    
    @property
    def last_call(self) -> Optional[Dict[str, Any]]:
        return self.calls[-1] if self.calls else None
    
    def reset(self) -> None:
        self.calls.clear()


def create_spy(implementation: Optional[Callable] = None) -> Spy:
    """
    Create a spy function that tracks calls.
    
    Args:
        implementation: Optional implementation function
        
    Returns:
        Spy object
        
    Example:
        spy = create_spy(lambda x: x * 2)
        result = spy(5)
        assert result == 10
        assert spy.call_count == 1
        assert spy.last_call['args'] == [5]
    """
    return Spy(implementation=implementation)


__all__ = [
    # Mock types
    "MockLogger",
    "MockStorage",
    "MockEventEmitter",
    "MockSettings",
    "MockContextOptions",
    "MockPluginContext",
    "Spy",
    
    # Factory functions
    "create_mock_logger",
    "create_mock_storage",
    "create_mock_event_emitter",
    "create_mock_settings",
    "create_mock_context",
    "create_mock_tool_context",
    "create_spy",
    
    # Test helpers
    "test_tool",
    "test_hook",
]
