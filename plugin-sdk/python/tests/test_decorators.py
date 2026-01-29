"""
Unit tests for cognia.decorators module
"""

import pytest
import asyncio
from typing import List, Optional, Dict, Any

from cognia.decorators import (
    tool,
    hook,
    command,
    HookType,
    VALID_HOOKS,
    _python_type_to_json_type,
    _param_to_dict,
)
from cognia.types import ToolParameter


class TestToolDecorator:
    """Tests for @tool decorator"""
    
    def test_tool_basic(self):
        """Test basic tool decoration"""
        @tool(description="Add two numbers")
        def add(self, a: int, b: int) -> int:
            return a + b
        
        assert hasattr(add, '_tool_metadata')
        metadata = add._tool_metadata
        assert metadata['name'] == 'add'
        assert metadata['description'] == 'Add two numbers'
    
    def test_tool_custom_name(self):
        """Test tool with custom name"""
        @tool(name="custom_add", description="Add numbers")
        def add(self, a: int, b: int) -> int:
            return a + b
        
        assert add._tool_metadata['name'] == 'custom_add'
    
    def test_tool_with_parameters(self):
        """Test tool with explicit parameter definitions"""
        @tool(
            name="search",
            description="Search the web",
            parameters={
                "query": {"type": "string", "description": "Search query"},
                "limit": {"type": "integer", "description": "Max results", "required": False},
            }
        )
        def search(self, query: str, limit: int = 10) -> dict:
            return {"results": []}
        
        metadata = search._tool_metadata
        assert 'query' in metadata['parameters']
        assert 'limit' in metadata['parameters']
        assert metadata['parameters']['query']['type'] == 'string'
        assert metadata['parameters']['limit']['required'] is False
    
    def test_tool_auto_detect_parameters(self):
        """Test automatic parameter detection from type hints"""
        @tool(description="Process data")
        def process(self, name: str, count: int, active: bool = True) -> dict:
            return {}
        
        metadata = process._tool_metadata
        params = metadata['parameters']
        
        assert 'name' in params
        assert 'count' in params
        assert 'active' in params
        assert params['name']['type'] == 'string'
        assert params['count']['type'] == 'number'
        assert params['active']['type'] == 'boolean'
        assert params['name']['required'] is True
        assert params['active']['required'] is False
    
    def test_tool_requires_approval(self):
        """Test tool with requires_approval flag"""
        @tool(description="Delete files", requires_approval=True)
        def delete(self, path: str) -> bool:
            return True
        
        assert delete._tool_metadata['requires_approval'] is True
    
    def test_tool_category(self):
        """Test tool with category"""
        @tool(description="Search", category="web")
        def search(self, query: str) -> dict:
            return {}
        
        assert search._tool_metadata['category'] == 'web'
    
    def test_tool_uses_docstring(self):
        """Test that tool uses docstring as description fallback"""
        @tool()
        def documented(self, value: str) -> str:
            """This is the docstring description."""
            return value
        
        # Note: empty description means docstring should be used
        assert 'docstring description' in documented._tool_metadata['description']
    
    def test_tool_preserves_function(self):
        """Test that decorated function still works"""
        @tool(description="Add numbers")
        def add(self, a: int, b: int) -> int:
            return a + b
        
        # Create a mock self
        class MockSelf:
            pass
        
        result = add(MockSelf(), 2, 3)
        assert result == 5
    
    def test_tool_async_function(self):
        """Test tool with async function"""
        @tool(description="Async operation")
        async def async_op(self, value: str) -> str:
            return value.upper()
        
        assert hasattr(async_op, '_tool_metadata')
        
        # Verify async function still works
        async def test():
            class MockSelf:
                pass
            result = await async_op(MockSelf(), "hello")
            assert result == "HELLO"
        
        asyncio.run(test())


class TestHookDecorator:
    """Tests for @hook decorator"""
    
    def test_hook_basic(self):
        """Test basic hook decoration"""
        @hook("on_agent_step")
        def on_step(self, agent_id: str, step: dict):
            pass
        
        assert hasattr(on_step, '_hook_metadata')
        metadata = on_step._hook_metadata
        assert metadata['hook_name'] == 'on_agent_step'
        assert metadata['priority'] == 0
        assert metadata['is_async'] is False
    
    def test_hook_with_priority(self):
        """Test hook with custom priority"""
        @hook("on_load", priority=10)
        def on_load(self):
            pass
        
        assert on_load._hook_metadata['priority'] == 10
    
    def test_hook_async_detection(self):
        """Test that async hooks are properly detected"""
        @hook("on_message_receive")
        async def on_message(self, message):
            return message
        
        assert on_message._hook_metadata['is_async'] is True
    
    def test_hook_preserves_function(self):
        """Test that decorated hook function still works"""
        @hook("on_agent_step")
        def on_step(self, agent_id: str, step: dict) -> str:
            return f"{agent_id}: {step['type']}"
        
        class MockSelf:
            pass
        
        result = on_step(MockSelf(), "agent-1", {"type": "thinking"})
        assert result == "agent-1: thinking"
    
    def test_hook_async_preserves_function(self):
        """Test that async hook function still works"""
        @hook("on_agent_step")
        async def on_step(self, agent_id: str) -> str:
            return agent_id.upper()
        
        async def test():
            class MockSelf:
                pass
            result = await on_step(MockSelf(), "agent-1")
            assert result == "AGENT-1"
        
        asyncio.run(test())


class TestCommandDecorator:
    """Tests for @command decorator"""
    
    def test_command_basic(self):
        """Test basic command decoration"""
        @command(description="Quick search")
        def search(self, args: List[str]):
            pass
        
        assert hasattr(search, '_command_metadata')
        metadata = search._command_metadata
        assert metadata['name'] == 'search'
        assert metadata['description'] == 'Quick search'
    
    def test_command_custom_name(self):
        """Test command with custom name"""
        @command(name="my_search", description="Search")
        def search(self, args: List[str]):
            pass
        
        assert search._command_metadata['name'] == 'my_search'
    
    def test_command_with_shortcut(self):
        """Test command with keyboard shortcut"""
        @command(description="New session", shortcut="Ctrl+Shift+N")
        def new_session(self, args: List[str]):
            pass
        
        assert new_session._command_metadata['shortcut'] == 'Ctrl+Shift+N'
    
    def test_command_uses_docstring(self):
        """Test that command uses docstring as description"""
        @command()
        def documented(self, args: List[str]):
            """This is the command docstring."""
            pass
        
        assert 'docstring' in documented._command_metadata['description']
    
    def test_command_preserves_function(self):
        """Test that command function still works"""
        @command(description="Echo args")
        def echo(self, args: List[str]) -> str:
            return " ".join(args)
        
        class MockSelf:
            pass
        
        result = echo(MockSelf(), ["hello", "world"])
        assert result == "hello world"


class TestPythonTypeToJsonType:
    """Tests for _python_type_to_json_type helper"""
    
    def test_string_type(self):
        """Test string type conversion"""
        assert _python_type_to_json_type(str) == 'string'
    
    def test_int_type(self):
        """Test int type conversion"""
        assert _python_type_to_json_type(int) == 'number'
    
    def test_float_type(self):
        """Test float type conversion"""
        assert _python_type_to_json_type(float) == 'number'
    
    def test_bool_type(self):
        """Test bool type conversion"""
        assert _python_type_to_json_type(bool) == 'boolean'
    
    def test_list_type(self):
        """Test list type conversion"""
        assert _python_type_to_json_type(list) == 'array'
    
    def test_dict_type(self):
        """Test dict type conversion"""
        assert _python_type_to_json_type(dict) == 'object'
    
    def test_optional_type(self):
        """Test Optional type conversion"""
        from typing import Optional
        # Optional[str] is Union[str, None]
        assert _python_type_to_json_type(Optional[str]) == 'string'
    
    def test_list_generic(self):
        """Test List[T] type conversion"""
        from typing import List
        assert _python_type_to_json_type(List[str]) == 'array'
    
    def test_dict_generic(self):
        """Test Dict[K, V] type conversion"""
        from typing import Dict
        assert _python_type_to_json_type(Dict[str, int]) == 'object'
    
    def test_unknown_type(self):
        """Test unknown type defaults to string"""
        class CustomType:
            pass
        assert _python_type_to_json_type(CustomType) == 'string'


class TestParamToDict:
    """Tests for _param_to_dict helper"""
    
    def test_basic_param(self):
        """Test converting basic parameter to dict"""
        param = ToolParameter(
            name="query",
            type="string",
            description="Search query",
            required=True,
        )
        result = _param_to_dict(param)
        
        assert result['type'] == 'string'
        assert result['description'] == 'Search query'
        assert result['required'] is True
        assert 'default' not in result
    
    def test_param_with_default(self):
        """Test converting parameter with default to dict"""
        param = ToolParameter(
            name="limit",
            type="number",
            description="Max results",
            required=False,
            default=10,
        )
        result = _param_to_dict(param)
        
        assert result['default'] == 10
        assert result['required'] is False
    
    def test_param_with_enum(self):
        """Test converting parameter with enum to dict"""
        param = ToolParameter(
            name="provider",
            type="string",
            description="Provider",
            required=True,
            enum=["google", "bing"],
        )
        result = _param_to_dict(param)
        
        assert result['enum'] == ["google", "bing"]
    
    def test_param_with_default_value(self):
        """Test parameter with default value"""
        param = ToolParameter(
            name="count",
            type="number",
            description="Count",
            required=False,
            default=10
        )
        result = _param_to_dict(param)
        
        assert result["default"] == 10
    
    def test_param_with_enum_values(self):
        """Test parameter with enum values"""
        param = ToolParameter(
            name="status",
            type="string",
            description="Status",
            required=True,
            enum=["a", "b", "c"]
        )
        result = _param_to_dict(param)
        
        assert result["enum"] == ["a", "b", "c"]


class TestHookType:
    """Tests for HookType enum"""
    
    def test_lifecycle_hooks(self):
        """Test lifecycle hook values"""
        assert HookType.ON_LOAD.value == "on_load"
        assert HookType.ON_ENABLE.value == "on_enable"
        assert HookType.ON_DISABLE.value == "on_disable"
        assert HookType.ON_UNLOAD.value == "on_unload"
        assert HookType.ON_CONFIG_CHANGE.value == "on_config_change"
    
    def test_agent_hooks(self):
        """Test agent hook values"""
        assert HookType.ON_AGENT_START.value == "on_agent_start"
        assert HookType.ON_AGENT_STEP.value == "on_agent_step"
        assert HookType.ON_AGENT_TOOL_CALL.value == "on_agent_tool_call"
        assert HookType.ON_AGENT_COMPLETE.value == "on_agent_complete"
        assert HookType.ON_AGENT_ERROR.value == "on_agent_error"
    
    def test_message_hooks(self):
        """Test message hook values"""
        assert HookType.ON_MESSAGE_SEND.value == "on_message_send"
        assert HookType.ON_MESSAGE_RECEIVE.value == "on_message_receive"
        assert HookType.ON_MESSAGE_RENDER.value == "on_message_render"
    
    def test_session_hooks(self):
        """Test session hook values"""
        assert HookType.ON_SESSION_CREATE.value == "on_session_create"
        assert HookType.ON_SESSION_SWITCH.value == "on_session_switch"
        assert HookType.ON_SESSION_DELETE.value == "on_session_delete"
    
    def test_project_hooks(self):
        """Test project hook values"""
        assert HookType.ON_PROJECT_CREATE.value == "on_project_create"
        assert HookType.ON_PROJECT_UPDATE.value == "on_project_update"
        assert HookType.ON_PROJECT_DELETE.value == "on_project_delete"
        assert HookType.ON_PROJECT_SWITCH.value == "on_project_switch"
        assert HookType.ON_KNOWLEDGE_FILE_ADD.value == "on_knowledge_file_add"
        assert HookType.ON_KNOWLEDGE_FILE_REMOVE.value == "on_knowledge_file_remove"
        assert HookType.ON_SESSION_LINKED.value == "on_session_linked"
        assert HookType.ON_SESSION_UNLINKED.value == "on_session_unlinked"
    
    def test_canvas_hooks(self):
        """Test canvas hook values"""
        assert HookType.ON_CANVAS_CREATE.value == "on_canvas_create"
        assert HookType.ON_CANVAS_UPDATE.value == "on_canvas_update"
        assert HookType.ON_CANVAS_DELETE.value == "on_canvas_delete"
        assert HookType.ON_CANVAS_SWITCH.value == "on_canvas_switch"
        assert HookType.ON_CANVAS_CONTENT_CHANGE.value == "on_canvas_content_change"
        assert HookType.ON_CANVAS_VERSION_SAVE.value == "on_canvas_version_save"
        assert HookType.ON_CANVAS_VERSION_RESTORE.value == "on_canvas_version_restore"
        assert HookType.ON_CANVAS_SELECTION.value == "on_canvas_selection"
    
    def test_artifact_hooks(self):
        """Test artifact hook values"""
        assert HookType.ON_ARTIFACT_CREATE.value == "on_artifact_create"
        assert HookType.ON_ARTIFACT_UPDATE.value == "on_artifact_update"
        assert HookType.ON_ARTIFACT_DELETE.value == "on_artifact_delete"
        assert HookType.ON_ARTIFACT_OPEN.value == "on_artifact_open"
        assert HookType.ON_ARTIFACT_CLOSE.value == "on_artifact_close"
        assert HookType.ON_ARTIFACT_EXECUTE.value == "on_artifact_execute"
        assert HookType.ON_ARTIFACT_EXPORT.value == "on_artifact_export"
    
    def test_export_hooks(self):
        """Test export hook values"""
        assert HookType.ON_EXPORT_START.value == "on_export_start"
        assert HookType.ON_EXPORT_COMPLETE.value == "on_export_complete"
        assert HookType.ON_EXPORT_TRANSFORM.value == "on_export_transform"
        assert HookType.ON_PROJECT_EXPORT_START.value == "on_project_export_start"
        assert HookType.ON_PROJECT_EXPORT_COMPLETE.value == "on_project_export_complete"
    
    def test_theme_hooks(self):
        """Test theme hook values"""
        assert HookType.ON_THEME_MODE_CHANGE.value == "on_theme_mode_change"
        assert HookType.ON_COLOR_PRESET_CHANGE.value == "on_color_preset_change"
        assert HookType.ON_CUSTOM_THEME_ACTIVATE.value == "on_custom_theme_activate"
    
    def test_ai_hooks(self):
        """Test AI/chat hook values"""
        assert HookType.ON_CHAT_REQUEST.value == "on_chat_request"
        assert HookType.ON_STREAM_START.value == "on_stream_start"
        assert HookType.ON_STREAM_CHUNK.value == "on_stream_chunk"
        assert HookType.ON_STREAM_END.value == "on_stream_end"
        assert HookType.ON_CHAT_ERROR.value == "on_chat_error"
        assert HookType.ON_TOKEN_USAGE.value == "on_token_usage"
    
    def test_vector_hooks(self):
        """Test vector/RAG hook values"""
        assert HookType.ON_DOCUMENTS_INDEXED.value == "on_documents_indexed"
        assert HookType.ON_VECTOR_SEARCH.value == "on_vector_search"
        assert HookType.ON_RAG_CONTEXT_RETRIEVED.value == "on_rag_context_retrieved"
    
    def test_workflow_hooks(self):
        """Test workflow hook values"""
        assert HookType.ON_WORKFLOW_START.value == "on_workflow_start"
        assert HookType.ON_WORKFLOW_STEP_COMPLETE.value == "on_workflow_step_complete"
        assert HookType.ON_WORKFLOW_COMPLETE.value == "on_workflow_complete"
        assert HookType.ON_WORKFLOW_ERROR.value == "on_workflow_error"
    
    def test_ui_hooks(self):
        """Test UI hook values"""
        assert HookType.ON_SIDEBAR_TOGGLE.value == "on_sidebar_toggle"
        assert HookType.ON_PANEL_OPEN.value == "on_panel_open"
        assert HookType.ON_PANEL_CLOSE.value == "on_panel_close"
        assert HookType.ON_SHORTCUT.value == "on_shortcut"
        assert HookType.ON_CONTEXT_MENU_SHOW.value == "on_context_menu_show"


class TestValidHooks:
    """Tests for VALID_HOOKS set"""
    
    def test_contains_all_hook_types(self):
        """Test VALID_HOOKS contains all HookType values"""
        for hook_type in HookType:
            assert hook_type.value in VALID_HOOKS
    
    def test_hook_count(self):
        """Test number of valid hooks"""
        assert len(VALID_HOOKS) == len(HookType)
        assert len(VALID_HOOKS) >= 50  # We have 50+ hooks


class TestHookDecoratorWithEnum:
    """Tests for @hook decorator with HookType enum"""
    
    def test_hook_with_enum(self):
        """Test hook decorator with HookType enum"""
        @hook(HookType.ON_AGENT_START)
        async def on_agent_start(agent_id: str):
            pass
        
        assert hasattr(on_agent_start, "_hook_metadata")
        metadata = on_agent_start._hook_metadata
        assert metadata["hook_name"] == "on_agent_start"
    
    def test_hook_with_string(self):
        """Test hook decorator with string (backward compatible)"""
        @hook("on_message_receive")
        async def on_message(message):
            pass
        
        metadata = on_message._hook_metadata
        assert metadata["hook_name"] == "on_message_receive"
    
    def test_hook_with_priority(self):
        """Test hook decorator with priority"""
        @hook(HookType.ON_CHAT_REQUEST, priority=10)
        async def high_priority_hook(request):
            pass
        
        metadata = high_priority_hook._hook_metadata
        assert metadata["priority"] == 10
    
    def test_hook_with_filter(self):
        """Test hook decorator with filter"""
        @hook(HookType.ON_PROJECT_CREATE, filter={"type": "knowledge"})
        async def on_knowledge_project(project):
            pass
        
        metadata = on_knowledge_project._hook_metadata
        assert metadata["filter"] == {"type": "knowledge"}
    
    def test_hook_async_detection(self):
        """Test async function detection"""
        @hook(HookType.ON_LOAD)
        async def async_hook():
            pass
        
        @hook(HookType.ON_LOAD)
        def sync_hook():
            pass
        
        assert async_hook._hook_metadata["is_async"] == True
        assert sync_hook._hook_metadata["is_async"] == False
    
    def test_multiple_hooks(self):
        """Test multiple hooks on different functions"""
        @hook(HookType.ON_SESSION_CREATE)
        async def on_create(session):
            pass
        
        @hook(HookType.ON_SESSION_DELETE)
        async def on_delete(session):
            pass
        
        assert on_create._hook_metadata["hook_name"] == "on_session_create"
        assert on_delete._hook_metadata["hook_name"] == "on_session_delete"


class TestToolDecoratorExtended:
    """Extended tests for @tool decorator"""
    
    def test_tool_with_schema(self):
        """Test tool with Schema helper parameters"""
        from cognia.schema import Schema, parameters
        
        @tool(
            name="create_user",
            description="Create a user",
            parameters=parameters({
                "name": Schema.string("User name"),
                "age": Schema.integer("User age"),
            })
        )
        async def create_user(name: str, age: int):
            pass
        
        metadata = create_user._tool_metadata
        assert metadata["name"] == "create_user"
        assert "name" in metadata["parameters"]
        assert "age" in metadata["parameters"]
    
    def test_tool_auto_detect_types(self):
        """Test tool auto-detects parameter types"""
        @tool(description="Test function")
        def test_func(text: str, count: int, flag: bool, items: list):
            pass
        
        metadata = test_func._tool_metadata
        params = metadata["parameters"]
        
        assert params["text"]["type"] == "string"
        assert params["count"]["type"] == "number"
        assert params["flag"]["type"] == "boolean"
        assert params["items"]["type"] == "array"
    
    def test_tool_optional_params(self):
        """Test tool detects optional parameters"""
        @tool(description="Test with optional")
        def test_func(required: str, optional: str = "default"):
            pass
        
        metadata = test_func._tool_metadata
        params = metadata["parameters"]
        
        assert params["required"]["required"] == True
        assert params["optional"]["required"] == False
        assert params["optional"]["default"] == "default"
    
    def test_tool_with_enum(self):
        """Test tool with enum parameter"""
        @tool(
            description="Test with enum",
            parameters={
                "status": {
                    "type": "string",
                    "description": "Status",
                    "enum": ["active", "inactive", "pending"]
                }
            }
        )
        def test_func(status: str):
            pass
        
        metadata = test_func._tool_metadata
        assert metadata["parameters"]["status"]["enum"] == ["active", "inactive", "pending"]
    
    def test_tool_with_category(self):
        """Test tool with category"""
        @tool(
            description="Categorized tool",
            category="utilities"
        )
        def util_tool():
            pass
        
        metadata = util_tool._tool_metadata
        assert metadata["category"] == "utilities"
    
    def test_tool_requires_approval(self):
        """Test tool with approval requirement"""
        @tool(
            description="Dangerous tool",
            requires_approval=True
        )
        def dangerous_tool():
            pass
        
        metadata = dangerous_tool._tool_metadata
        assert metadata["requires_approval"] == True


class TestCommandDecoratorExtended:
    """Extended tests for @command decorator"""
    
    def test_command_basic(self):
        """Test basic command"""
        @command(
            name="my_command",
            description="My command"
        )
        def my_cmd(args):
            pass
        
        metadata = my_cmd._command_metadata
        assert metadata["name"] == "my_command"
        assert metadata["description"] == "My command"
    
    def test_command_with_shortcut(self):
        """Test command with shortcut"""
        @command(
            name="quick_action",
            description="Quick action",
            shortcut="Ctrl+Shift+Q"
        )
        def quick_action(args):
            pass
        
        metadata = quick_action._command_metadata
        assert metadata["shortcut"] == "Ctrl+Shift+Q"
    
    def test_command_default_name(self):
        """Test command uses function name as default"""
        @command(description="Test")
        def my_function(args):
            pass
        
        metadata = my_function._command_metadata
        assert metadata["name"] == "my_function"
