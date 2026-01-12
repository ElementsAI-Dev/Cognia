"""
Unit tests for cognia.decorators module
"""

import pytest
import asyncio
from typing import List, Optional, Dict, Any

from cognia.decorators import tool, hook, command, _python_type_to_json_type, _param_to_dict
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
