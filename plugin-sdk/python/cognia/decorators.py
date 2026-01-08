"""
Decorators for Cognia Plugin SDK

Provides @tool, @hook, and @command decorators for defining plugin functionality.
"""

import functools
import inspect
from typing import Any, Callable, Dict, List, Optional, TypeVar, Union

from .types import (
    ToolMetadata,
    ToolParameter,
    HookMetadata,
    CommandMetadata,
)

F = TypeVar('F', bound=Callable[..., Any])


def tool(
    name: Optional[str] = None,
    description: str = "",
    parameters: Optional[Dict[str, Dict[str, Any]]] = None,
    requires_approval: bool = False,
    category: Optional[str] = None,
) -> Callable[[F], F]:
    """
    Decorator to mark a method as a tool that can be called by the AI agent.
    
    Args:
        name: Tool name (defaults to function name)
        description: Description of what the tool does
        parameters: Parameter definitions (auto-detected from type hints if not provided)
        requires_approval: Whether the tool requires user approval before execution
        category: Category for organizing tools
    
    Example:
        @tool(
            name="analyze_data",
            description="Analyze data from a CSV file",
            parameters={
                "file_path": {"type": "string", "description": "Path to CSV file"},
                "columns": {"type": "array", "description": "Columns to analyze", "required": False}
            }
        )
        async def analyze_data(self, file_path: str, columns: List[str] = None):
            ...
    """
    def decorator(func: F) -> F:
        tool_name = name or func.__name__
        
        # Auto-detect parameters from type hints if not provided
        tool_params = {}
        if parameters:
            for param_name, param_def in parameters.items():
                tool_params[param_name] = ToolParameter(
                    name=param_name,
                    type=param_def.get("type", "string"),
                    description=param_def.get("description", ""),
                    required=param_def.get("required", True),
                    default=param_def.get("default"),
                    enum=param_def.get("enum"),
                )
        else:
            # Auto-detect from function signature
            sig = inspect.signature(func)
            hints = func.__annotations__ if hasattr(func, '__annotations__') else {}
            
            for param_name, param in sig.parameters.items():
                if param_name == 'self':
                    continue
                
                param_type = "string"
                if param_name in hints:
                    hint = hints[param_name]
                    param_type = _python_type_to_json_type(hint)
                
                tool_params[param_name] = ToolParameter(
                    name=param_name,
                    type=param_type,
                    description="",
                    required=param.default == inspect.Parameter.empty,
                    default=None if param.default == inspect.Parameter.empty else param.default,
                )
        
        # Attach metadata to function
        func._tool_metadata = {
            "name": tool_name,
            "description": description or func.__doc__ or "",
            "parameters": {k: _param_to_dict(v) for k, v in tool_params.items()},
            "requires_approval": requires_approval,
            "category": category,
        }
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        
        wrapper._tool_metadata = func._tool_metadata
        return wrapper
    
    return decorator


def hook(
    hook_name: str,
    priority: int = 0,
) -> Callable[[F], F]:
    """
    Decorator to mark a method as a hook that responds to system events.
    
    Args:
        hook_name: Name of the hook to subscribe to
        priority: Priority order (higher priority runs first)
    
    Available hooks:
        - on_load: Called when plugin is loaded
        - on_enable: Called when plugin is enabled
        - on_disable: Called when plugin is disabled
        - on_unload: Called when plugin is unloaded
        - on_config_change: Called when plugin config changes
        - on_agent_start: Called when an agent starts
        - on_agent_step: Called for each agent step
        - on_agent_tool_call: Called before a tool is executed
        - on_agent_complete: Called when agent completes
        - on_message_send: Called before a message is sent
        - on_message_receive: Called when a message is received
        - on_session_create: Called when a new session is created
        - on_session_switch: Called when switching sessions
    
    Example:
        @hook("on_agent_step")
        async def on_step(self, agent_id: str, step: dict):
            self.logger.info(f"Agent {agent_id} step: {step}")
    """
    def decorator(func: F) -> F:
        is_async = inspect.iscoroutinefunction(func)
        
        func._hook_metadata = {
            "hook_name": hook_name,
            "priority": priority,
            "is_async": is_async,
        }
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        
        wrapper._hook_metadata = func._hook_metadata
        return wrapper
    
    return decorator


def command(
    name: Optional[str] = None,
    description: str = "",
    shortcut: Optional[str] = None,
) -> Callable[[F], F]:
    """
    Decorator to mark a method as a slash command.
    
    Args:
        name: Command name (defaults to function name)
        description: Description of the command
        shortcut: Keyboard shortcut (e.g., "Ctrl+Shift+P")
    
    Example:
        @command(
            name="my_command",
            description="Do something cool",
            shortcut="Ctrl+Alt+M"
        )
        def my_command(self, args: List[str]):
            ...
    """
    def decorator(func: F) -> F:
        cmd_name = name or func.__name__
        
        func._command_metadata = {
            "name": cmd_name,
            "description": description or func.__doc__ or "",
            "shortcut": shortcut,
        }
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        
        wrapper._command_metadata = func._command_metadata
        return wrapper
    
    return decorator


def _python_type_to_json_type(python_type: Any) -> str:
    """Convert Python type hint to JSON Schema type"""
    type_name = getattr(python_type, '__name__', str(python_type))
    
    type_mapping = {
        'str': 'string',
        'int': 'number',
        'float': 'number',
        'bool': 'boolean',
        'list': 'array',
        'List': 'array',
        'dict': 'object',
        'Dict': 'object',
        'Any': 'any',
    }
    
    # Handle Optional types
    if hasattr(python_type, '__origin__'):
        origin = python_type.__origin__
        if origin is Union:
            # Check if it's Optional (Union with None)
            args = python_type.__args__
            non_none_args = [a for a in args if a is not type(None)]
            if len(non_none_args) == 1:
                return _python_type_to_json_type(non_none_args[0])
        elif origin is list:
            return 'array'
        elif origin is dict:
            return 'object'
    
    return type_mapping.get(type_name, 'string')


def _param_to_dict(param: ToolParameter) -> Dict[str, Any]:
    """Convert ToolParameter to dictionary"""
    result = {
        "type": param.type,
        "description": param.description,
        "required": param.required,
    }
    if param.default is not None:
        result["default"] = param.default
    if param.enum:
        result["enum"] = param.enum
    return result
