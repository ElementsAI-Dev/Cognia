"""
Decorators for Cognia Plugin SDK

Provides @tool, @hook, and @command decorators for defining plugin functionality.
"""

import functools
import inspect
from typing import Any, Callable, Dict, List, Optional, TypeVar, Union
from enum import Enum

from .types import (
    ToolMetadata,
    ToolParameter,
    HookMetadata,
    CommandMetadata,
)

F = TypeVar('F', bound=Callable[..., Any])


class HookType(Enum):
    """All available hook types for plugins"""
    
    # Lifecycle Hooks
    ON_LOAD = "on_load"
    ON_ENABLE = "on_enable"
    ON_DISABLE = "on_disable"
    ON_UNLOAD = "on_unload"
    ON_CONFIG_CHANGE = "on_config_change"
    
    # Agent Hooks
    ON_AGENT_START = "on_agent_start"
    ON_AGENT_STEP = "on_agent_step"
    ON_AGENT_TOOL_CALL = "on_agent_tool_call"
    ON_AGENT_COMPLETE = "on_agent_complete"
    ON_AGENT_ERROR = "on_agent_error"
    
    # Message Hooks
    ON_MESSAGE_SEND = "on_message_send"
    ON_MESSAGE_RECEIVE = "on_message_receive"
    ON_MESSAGE_RENDER = "on_message_render"
    
    # Session Hooks
    ON_SESSION_CREATE = "on_session_create"
    ON_SESSION_SWITCH = "on_session_switch"
    ON_SESSION_DELETE = "on_session_delete"
    
    # Project Hooks
    ON_PROJECT_CREATE = "on_project_create"
    ON_PROJECT_UPDATE = "on_project_update"
    ON_PROJECT_DELETE = "on_project_delete"
    ON_PROJECT_SWITCH = "on_project_switch"
    ON_KNOWLEDGE_FILE_ADD = "on_knowledge_file_add"
    ON_KNOWLEDGE_FILE_REMOVE = "on_knowledge_file_remove"
    ON_SESSION_LINKED = "on_session_linked"
    ON_SESSION_UNLINKED = "on_session_unlinked"
    
    # Canvas Hooks
    ON_CANVAS_CREATE = "on_canvas_create"
    ON_CANVAS_UPDATE = "on_canvas_update"
    ON_CANVAS_DELETE = "on_canvas_delete"
    ON_CANVAS_SWITCH = "on_canvas_switch"
    ON_CANVAS_CONTENT_CHANGE = "on_canvas_content_change"
    ON_CANVAS_VERSION_SAVE = "on_canvas_version_save"
    ON_CANVAS_VERSION_RESTORE = "on_canvas_version_restore"
    ON_CANVAS_SELECTION = "on_canvas_selection"
    
    # Artifact Hooks
    ON_ARTIFACT_CREATE = "on_artifact_create"
    ON_ARTIFACT_UPDATE = "on_artifact_update"
    ON_ARTIFACT_DELETE = "on_artifact_delete"
    ON_ARTIFACT_OPEN = "on_artifact_open"
    ON_ARTIFACT_CLOSE = "on_artifact_close"
    ON_ARTIFACT_EXECUTE = "on_artifact_execute"
    ON_ARTIFACT_EXPORT = "on_artifact_export"
    
    # Export Hooks
    ON_EXPORT_START = "on_export_start"
    ON_EXPORT_COMPLETE = "on_export_complete"
    ON_EXPORT_TRANSFORM = "on_export_transform"
    ON_PROJECT_EXPORT_START = "on_project_export_start"
    ON_PROJECT_EXPORT_COMPLETE = "on_project_export_complete"
    
    # Theme Hooks
    ON_THEME_MODE_CHANGE = "on_theme_mode_change"
    ON_COLOR_PRESET_CHANGE = "on_color_preset_change"
    ON_CUSTOM_THEME_ACTIVATE = "on_custom_theme_activate"
    
    # AI/Chat Hooks
    ON_CHAT_REQUEST = "on_chat_request"
    ON_STREAM_START = "on_stream_start"
    ON_STREAM_CHUNK = "on_stream_chunk"
    ON_STREAM_END = "on_stream_end"
    ON_CHAT_ERROR = "on_chat_error"
    ON_TOKEN_USAGE = "on_token_usage"
    
    # Vector/RAG Hooks
    ON_DOCUMENTS_INDEXED = "on_documents_indexed"
    ON_VECTOR_SEARCH = "on_vector_search"
    ON_RAG_CONTEXT_RETRIEVED = "on_rag_context_retrieved"
    
    # Workflow Hooks
    ON_WORKFLOW_START = "on_workflow_start"
    ON_WORKFLOW_STEP_COMPLETE = "on_workflow_step_complete"
    ON_WORKFLOW_COMPLETE = "on_workflow_complete"
    ON_WORKFLOW_ERROR = "on_workflow_error"
    
    # UI Hooks
    ON_SIDEBAR_TOGGLE = "on_sidebar_toggle"
    ON_PANEL_OPEN = "on_panel_open"
    ON_PANEL_CLOSE = "on_panel_close"
    ON_SHORTCUT = "on_shortcut"
    ON_CONTEXT_MENU_SHOW = "on_context_menu_show"


# List of all valid hook names for validation
VALID_HOOKS = {h.value for h in HookType}


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
    hook_name: Union[str, HookType],
    priority: int = 0,
    *,
    filter: Optional[Dict[str, Any]] = None,
) -> Callable[[F], F]:
    """
    Decorator to mark a method as a hook that responds to system events.
    
    Args:
        hook_name: Name of the hook to subscribe to (string or HookType enum)
        priority: Priority order (higher priority runs first)
        filter: Optional filter conditions for the hook
    
    Lifecycle Hooks:
        - on_load: Called when plugin is loaded
        - on_enable: Called when plugin is enabled
        - on_disable: Called when plugin is disabled
        - on_unload: Called when plugin is unloaded
        - on_config_change: Called when plugin config changes
    
    Agent Hooks:
        - on_agent_start: Called when an agent starts
        - on_agent_step: Called for each agent step
        - on_agent_tool_call: Called before a tool is executed
        - on_agent_complete: Called when agent completes
        - on_agent_error: Called when agent errors
    
    Message Hooks:
        - on_message_send: Called before a message is sent
        - on_message_receive: Called when a message is received
        - on_message_render: Called when rendering a message
    
    Session Hooks:
        - on_session_create: Called when a new session is created
        - on_session_switch: Called when switching sessions
        - on_session_delete: Called when a session is deleted
    
    Project Hooks:
        - on_project_create: Called when a project is created
        - on_project_update: Called when a project is updated
        - on_project_delete: Called when a project is deleted
        - on_project_switch: Called when switching projects
        - on_knowledge_file_add: Called when a file is added to project
        - on_knowledge_file_remove: Called when a file is removed
        - on_session_linked: Called when session is linked to project
        - on_session_unlinked: Called when session is unlinked
    
    Canvas Hooks:
        - on_canvas_create: Called when a canvas document is created
        - on_canvas_update: Called when a canvas document is updated
        - on_canvas_delete: Called when a canvas document is deleted
        - on_canvas_switch: Called when switching canvas documents
        - on_canvas_content_change: Called when canvas content changes
        - on_canvas_version_save: Called when a version is saved
        - on_canvas_version_restore: Called when a version is restored
        - on_canvas_selection: Called when selection changes
    
    Artifact Hooks:
        - on_artifact_create: Called when an artifact is created
        - on_artifact_update: Called when an artifact is updated
        - on_artifact_delete: Called when an artifact is deleted
        - on_artifact_open: Called when artifact panel opens
        - on_artifact_close: Called when artifact panel closes
        - on_artifact_execute: Called when artifact is executed
        - on_artifact_export: Called when artifact is exported
    
    Export Hooks:
        - on_export_start: Called when export starts
        - on_export_complete: Called when export completes
        - on_export_transform: Called to transform export content
        - on_project_export_start: Called when project export starts
        - on_project_export_complete: Called when project export completes
    
    Theme Hooks:
        - on_theme_mode_change: Called when theme mode changes
        - on_color_preset_change: Called when color preset changes
        - on_custom_theme_activate: Called when custom theme activates
    
    AI/Chat Hooks:
        - on_chat_request: Called before chat request
        - on_stream_start: Called when streaming starts
        - on_stream_chunk: Called for each stream chunk
        - on_stream_end: Called when streaming ends
        - on_chat_error: Called on chat error
        - on_token_usage: Called with token usage stats
    
    Vector/RAG Hooks:
        - on_documents_indexed: Called when documents are indexed
        - on_vector_search: Called on vector search
        - on_rag_context_retrieved: Called when RAG context retrieved
    
    Workflow Hooks:
        - on_workflow_start: Called when workflow starts
        - on_workflow_step_complete: Called when workflow step completes
        - on_workflow_complete: Called when workflow completes
        - on_workflow_error: Called on workflow error
    
    UI Hooks:
        - on_sidebar_toggle: Called when sidebar toggles
        - on_panel_open: Called when a panel opens
        - on_panel_close: Called when a panel closes
        - on_shortcut: Called on keyboard shortcut
        - on_context_menu_show: Called when context menu shows
    
    Example:
        @hook("on_agent_step")
        async def on_step(self, agent_id: str, step: dict):
            self.logger.info(f"Agent {agent_id} step: {step}")
        
        @hook(HookType.ON_PROJECT_CREATE)
        async def on_project(self, project):
            self.logger.info(f"Project created: {project.name}")
    """
    def decorator(func: F) -> F:
        is_async = inspect.iscoroutinefunction(func)
        
        # Convert HookType enum to string
        name = hook_name.value if isinstance(hook_name, HookType) else hook_name
        
        func._hook_metadata = {
            "hook_name": name,
            "priority": priority,
            "is_async": is_async,
            "filter": filter,
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
