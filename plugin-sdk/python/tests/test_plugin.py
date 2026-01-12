"""
Unit tests for cognia.plugin module
"""

import pytest
import asyncio
import json
import tempfile
import os
from typing import Dict, Any, List

from cognia.plugin import Plugin, PluginMeta, create_plugin
from cognia.types import PluginContext, PluginType, PluginCapability
from cognia.decorators import tool, hook, command


class TestPluginMeta:
    """Tests for PluginMeta metaclass"""
    
    def test_metaclass_collects_tools(self):
        """Test that metaclass collects tools from methods"""
        class TestPlugin(Plugin):
            name = "test"
            version = "1.0.0"
            description = "Test plugin"
            
            @tool(description="Test tool")
            def my_tool(self, arg: str) -> str:
                return arg
        
        assert len(TestPlugin._registered_tools) == 1
        assert TestPlugin._registered_tools[0]['name'] == 'my_tool'
    
    def test_metaclass_collects_hooks(self):
        """Test that metaclass collects hooks from methods"""
        class TestPlugin(Plugin):
            name = "test"
            version = "1.0.0"
            description = "Test plugin"
            
            @hook("on_load")
            def my_hook(self):
                pass
        
        assert len(TestPlugin._registered_hooks) == 1
        assert TestPlugin._registered_hooks[0]['hook_name'] == 'on_load'
    
    def test_metaclass_collects_commands(self):
        """Test that metaclass collects commands from methods"""
        class TestPlugin(Plugin):
            name = "test"
            version = "1.0.0"
            description = "Test plugin"
            
            @command(description="Test command")
            def my_command(self, args: List[str]):
                pass
        
        assert len(TestPlugin._registered_commands) == 1
        assert TestPlugin._registered_commands[0]['name'] == 'my_command'
    
    def test_metaclass_collects_multiple(self):
        """Test collecting multiple tools, hooks, and commands"""
        class TestPlugin(Plugin):
            name = "test"
            version = "1.0.0"
            description = "Test plugin"
            
            @tool(description="Tool 1")
            def tool1(self, arg: str) -> str:
                return arg
            
            @tool(description="Tool 2")
            def tool2(self, arg: int) -> int:
                return arg * 2
            
            @hook("on_load")
            def hook1(self):
                pass
            
            @hook("on_enable")
            def hook2(self):
                pass
            
            @command(description="Cmd 1")
            def cmd1(self, args: List[str]):
                pass
        
        assert len(TestPlugin._registered_tools) == 2
        assert len(TestPlugin._registered_hooks) == 2
        assert len(TestPlugin._registered_commands) == 1


class TestPlugin:
    """Tests for Plugin base class"""
    
    def test_plugin_creation(self, plugin_context):
        """Test creating a plugin instance"""
        class TestPlugin(Plugin):
            name = "test-plugin"
            version = "1.0.0"
            description = "A test plugin"
        
        plugin = TestPlugin(plugin_context)
        
        assert plugin.context == plugin_context
        assert plugin.config == {}
        assert plugin.is_enabled is False
    
    def test_plugin_default_context(self):
        """Test plugin creation with default context"""
        class TestPlugin(Plugin):
            name = "test-plugin"
            version = "1.0.0"
            description = "A test plugin"
        
        plugin = TestPlugin()
        
        assert plugin.context is not None
        assert plugin.context.plugin_id == "test-plugin"
    
    def test_plugin_logger_property(self, plugin_context):
        """Test that logger property returns context"""
        class TestPlugin(Plugin):
            name = "test"
            version = "1.0.0"
            description = "Test"
        
        plugin = TestPlugin(plugin_context)
        
        # Logger is an alias for context
        assert plugin.logger == plugin.context
    
    @pytest.mark.asyncio
    async def test_on_load_lifecycle(self, plugin_context):
        """Test on_load lifecycle method"""
        class TestPlugin(Plugin):
            name = "test"
            version = "1.0.0"
            description = "Test"
            loaded = False
            
            async def on_load(self):
                self.loaded = True
        
        plugin = TestPlugin(plugin_context)
        await plugin.on_load()
        
        assert plugin.loaded is True
    
    @pytest.mark.asyncio
    async def test_on_enable_lifecycle(self, plugin_context):
        """Test on_enable lifecycle method"""
        class TestPlugin(Plugin):
            name = "test"
            version = "1.0.0"
            description = "Test"
        
        plugin = TestPlugin(plugin_context)
        assert plugin.is_enabled is False
        
        await plugin.on_enable()
        
        assert plugin.is_enabled is True
    
    @pytest.mark.asyncio
    async def test_on_disable_lifecycle(self, plugin_context):
        """Test on_disable lifecycle method"""
        class TestPlugin(Plugin):
            name = "test"
            version = "1.0.0"
            description = "Test"
        
        plugin = TestPlugin(plugin_context)
        plugin._enabled = True
        
        await plugin.on_disable()
        
        assert plugin.is_enabled is False
    
    @pytest.mark.asyncio
    async def test_on_unload_lifecycle(self, plugin_context):
        """Test on_unload lifecycle method"""
        class TestPlugin(Plugin):
            name = "test"
            version = "1.0.0"
            description = "Test"
            unloaded = False
            
            async def on_unload(self):
                self.unloaded = True
        
        plugin = TestPlugin(plugin_context)
        await plugin.on_unload()
        
        assert plugin.unloaded is True
    
    def test_on_config_change(self, plugin_context):
        """Test on_config_change method"""
        class TestPlugin(Plugin):
            name = "test"
            version = "1.0.0"
            description = "Test"
        
        plugin = TestPlugin(plugin_context)
        
        new_config = {"key": "value", "number": 42}
        plugin.on_config_change(new_config)
        
        assert plugin.config == new_config
    
    def test_get_manifest(self, plugin_context):
        """Test get_manifest method"""
        class TestPlugin(Plugin):
            name = "test-plugin"
            version = "2.0.0"
            description = "A test plugin"
            capabilities = [PluginCapability.TOOLS, PluginCapability.HOOKS]
            python_dependencies = ["requests>=2.28"]
        
        plugin = TestPlugin(plugin_context)
        manifest = plugin.get_manifest()
        
        assert manifest.id == "test-plugin"
        assert manifest.name == "test-plugin"
        assert manifest.version == "2.0.0"
        assert manifest.description == "A test plugin"
        assert manifest.plugin_type == PluginType.PYTHON
        assert PluginCapability.TOOLS in manifest.capabilities
        assert PluginCapability.HOOKS in manifest.capabilities
        assert "requests>=2.28" in manifest.python_dependencies
    
    def test_get_tools(self, plugin_context):
        """Test get_tools method"""
        class TestPlugin(Plugin):
            name = "test"
            version = "1.0.0"
            description = "Test"
            
            @tool(description="Tool 1")
            def tool1(self, arg: str) -> str:
                return arg
            
            @tool(description="Tool 2")
            def tool2(self, arg: int) -> int:
                return arg
        
        plugin = TestPlugin(plugin_context)
        tools = plugin.get_tools()
        
        assert len(tools) == 2
        tool_names = [t['name'] for t in tools]
        assert 'tool1' in tool_names
        assert 'tool2' in tool_names
    
    def test_get_hooks(self, plugin_context):
        """Test get_hooks method"""
        class TestPlugin(Plugin):
            name = "test"
            version = "1.0.0"
            description = "Test"
            
            @hook("on_load")
            def hook1(self):
                pass
            
            @hook("on_agent_step")
            def hook2(self, agent_id: str, step: dict):
                pass
        
        plugin = TestPlugin(plugin_context)
        hooks = plugin.get_hooks()
        
        assert len(hooks) == 2
        hook_names = [h['hook_name'] for h in hooks]
        assert 'on_load' in hook_names
        assert 'on_agent_step' in hook_names
    
    def test_get_commands(self, plugin_context):
        """Test get_commands method"""
        class TestPlugin(Plugin):
            name = "test"
            version = "1.0.0"
            description = "Test"
            
            @command(description="Command 1")
            def cmd1(self, args: List[str]):
                pass
        
        plugin = TestPlugin(plugin_context)
        commands = plugin.get_commands()
        
        assert len(commands) == 1
        assert commands[0]['name'] == 'cmd1'


class TestPluginGenerateManifest:
    """Tests for Plugin.generate_manifest_file"""
    
    def test_generate_manifest_file(self):
        """Test generating manifest file"""
        class TestPlugin(Plugin):
            name = "manifest-test"
            version = "1.0.0"
            description = "Test manifest generation"
            
            @tool(
                name="search",
                description="Search for something",
                requires_approval=True
            )
            def search(self, query: str, limit: int = 10) -> dict:
                return {}
        
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = os.path.join(tmpdir, "plugin.json")
            result = TestPlugin.generate_manifest_file(output_path)
            
            assert result == output_path
            assert os.path.exists(output_path)
            
            with open(output_path, 'r') as f:
                manifest = json.load(f)
            
            assert manifest['id'] == 'manifest-test'
            assert manifest['version'] == '1.0.0'
            assert 'tools' in manifest
            assert len(manifest['tools']) == 1
            assert manifest['tools'][0]['name'] == 'search'
            assert manifest['tools'][0]['requiresApproval'] is True
    
    def test_generate_manifest_with_parameters(self):
        """Test manifest generation includes parameter schemas"""
        class TestPlugin(Plugin):
            name = "param-test"
            version = "1.0.0"
            description = "Test"
            
            @tool(
                description="Tool with params",
                parameters={
                    "query": {"type": "string", "description": "Query text"},
                    "limit": {"type": "number", "description": "Limit", "required": False},
                }
            )
            def my_tool(self, query: str, limit: int = 10) -> dict:
                return {}
        
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = os.path.join(tmpdir, "plugin.json")
            TestPlugin.generate_manifest_file(output_path)
            
            with open(output_path, 'r') as f:
                manifest = json.load(f)
            
            tool_def = manifest['tools'][0]
            params_schema = tool_def['parametersSchema']
            
            assert params_schema['type'] == 'object'
            assert 'query' in params_schema['properties']
            assert 'limit' in params_schema['properties']
            assert 'query' in params_schema['required']
            assert 'limit' not in params_schema['required']


class TestCreatePlugin:
    """Tests for create_plugin factory function"""
    
    def test_create_plugin_basic(self):
        """Test creating plugin with factory function"""
        MyPlugin = create_plugin(
            name="dynamic-plugin",
            version="1.0.0",
            description="A dynamically created plugin",
        )
        
        assert MyPlugin.name == "dynamic-plugin"
        assert MyPlugin.version == "1.0.0"
        assert MyPlugin.description == "A dynamically created plugin"
    
    def test_create_plugin_with_kwargs(self):
        """Test creating plugin with additional kwargs"""
        MyPlugin = create_plugin(
            name="dynamic-plugin",
            version="1.0.0",
            description="Test",
            capabilities=[PluginCapability.TOOLS],
            python_dependencies=["requests"],
        )
        
        assert PluginCapability.TOOLS in MyPlugin.capabilities
        assert "requests" in MyPlugin.python_dependencies
    
    def test_create_plugin_instantiation(self, plugin_context):
        """Test that factory-created plugin can be instantiated"""
        MyPlugin = create_plugin(
            name="dynamic-plugin",
            version="1.0.0",
            description="Test",
        )
        
        plugin = MyPlugin(plugin_context)
        
        assert plugin.context == plugin_context
        assert plugin._enabled is False
    
    def test_create_plugin_is_subclass(self):
        """Test that factory-created plugin is Plugin subclass"""
        MyPlugin = create_plugin(
            name="test",
            version="1.0.0",
            description="Test",
        )
        
        assert issubclass(MyPlugin, Plugin)


class TestPluginWithExtendedContext:
    """Tests for Plugin with ExtendedPluginContext"""
    
    def test_plugin_with_extended_context(self, extended_context):
        """Test plugin with extended context"""
        class TestPlugin(Plugin):
            name = "test"
            version = "1.0.0"
            description = "Test"
        
        plugin = TestPlugin(extended_context)
        
        assert plugin.context.session is not None
        assert plugin.context.project is not None
        assert plugin.context.vector is not None
    
    @pytest.mark.asyncio
    async def test_plugin_uses_session_api(self, extended_context):
        """Test plugin using session API"""
        class TestPlugin(Plugin):
            name = "test"
            version = "1.0.0"
            description = "Test"
            
            async def get_session_id(self):
                return self.context.session.get_current_session_id()
        
        plugin = TestPlugin(extended_context)
        session_id = await plugin.get_session_id()
        
        assert session_id == "test-session-id"
    
    @pytest.mark.asyncio
    async def test_plugin_uses_vector_api(self, extended_context):
        """Test plugin using vector API"""
        class TestPlugin(Plugin):
            name = "test"
            version = "1.0.0"
            description = "Test"
            
            async def embed_text(self, text: str):
                return await self.context.vector.embed(text)
        
        plugin = TestPlugin(extended_context)
        embedding = await plugin.embed_text("hello")
        
        assert len(embedding) == 1536
    
    def test_plugin_uses_theme_api(self, extended_context):
        """Test plugin using theme API"""
        from cognia import ThemeMode
        
        class TestPlugin(Plugin):
            name = "test"
            version = "1.0.0"
            description = "Test"
            
            def get_theme_mode(self):
                return self.context.theme.get_mode()
        
        plugin = TestPlugin(extended_context)
        mode = plugin.get_theme_mode()
        
        assert mode == ThemeMode.DARK
