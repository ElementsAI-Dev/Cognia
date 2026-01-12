"""
Unit tests for cognia.types module
"""

import pytest
from cognia.types import (
    PluginType,
    PluginCapability,
    PluginPermission,
    PluginManifest,
    PluginContext,
    ToolContext,
    ToolParameter,
    ToolMetadata,
    HookMetadata,
    CommandMetadata,
    PluginAuthor,
)


class TestPluginType:
    """Tests for PluginType enum"""
    
    def test_plugin_type_values(self):
        """Test that PluginType has expected values"""
        assert PluginType.FRONTEND.value == "frontend"
        assert PluginType.PYTHON.value == "python"
        assert PluginType.HYBRID.value == "hybrid"
    
    def test_plugin_type_from_string(self):
        """Test creating PluginType from string value"""
        assert PluginType("frontend") == PluginType.FRONTEND
        assert PluginType("python") == PluginType.PYTHON
        assert PluginType("hybrid") == PluginType.HYBRID


class TestPluginCapability:
    """Tests for PluginCapability enum"""
    
    def test_capability_values(self):
        """Test that PluginCapability has expected values"""
        assert PluginCapability.TOOLS.value == "tools"
        assert PluginCapability.COMPONENTS.value == "components"
        assert PluginCapability.MODES.value == "modes"
        assert PluginCapability.HOOKS.value == "hooks"
        assert PluginCapability.COMMANDS.value == "commands"
    
    def test_all_capabilities_exist(self):
        """Test that all expected capabilities exist"""
        expected = [
            "tools", "components", "modes", "skills", "themes",
            "commands", "hooks", "processors", "providers", "exporters", "importers"
        ]
        actual = [c.value for c in PluginCapability]
        for cap in expected:
            assert cap in actual, f"Missing capability: {cap}"


class TestPluginPermission:
    """Tests for PluginPermission enum"""
    
    def test_permission_values(self):
        """Test that PluginPermission has expected values"""
        assert PluginPermission.FILESYSTEM_READ.value == "filesystem:read"
        assert PluginPermission.NETWORK_FETCH.value == "network:fetch"
        assert PluginPermission.SHELL_EXECUTE.value == "shell:execute"
    
    def test_permission_categories(self):
        """Test that permissions are properly categorized"""
        filesystem_perms = [p for p in PluginPermission if "filesystem" in p.value]
        assert len(filesystem_perms) == 2  # read and write
        
        network_perms = [p for p in PluginPermission if "network" in p.value]
        assert len(network_perms) == 2  # fetch and websocket


class TestToolParameter:
    """Tests for ToolParameter dataclass"""
    
    def test_create_tool_parameter(self):
        """Test creating a ToolParameter"""
        param = ToolParameter(
            name="query",
            type="string",
            description="Search query",
            required=True,
        )
        assert param.name == "query"
        assert param.type == "string"
        assert param.description == "Search query"
        assert param.required is True
        assert param.default is None
        assert param.enum is None
    
    def test_tool_parameter_with_defaults(self):
        """Test ToolParameter with default values"""
        param = ToolParameter(
            name="limit",
            type="number",
            description="Max results",
            required=False,
            default=10,
        )
        assert param.required is False
        assert param.default == 10
    
    def test_tool_parameter_with_enum(self):
        """Test ToolParameter with enum values"""
        param = ToolParameter(
            name="provider",
            type="string",
            description="Search provider",
            required=True,
            enum=["google", "bing", "duckduckgo"],
        )
        assert param.enum == ["google", "bing", "duckduckgo"]


class TestToolMetadata:
    """Tests for ToolMetadata dataclass"""
    
    def test_create_tool_metadata(self):
        """Test creating ToolMetadata"""
        metadata = ToolMetadata(
            name="search",
            description="Search the web",
        )
        assert metadata.name == "search"
        assert metadata.description == "Search the web"
        assert metadata.parameters == {}
        assert metadata.requires_approval is False
        assert metadata.category is None
    
    def test_tool_metadata_with_parameters(self):
        """Test ToolMetadata with parameters"""
        params = {
            "query": ToolParameter(name="query", type="string", description="Query")
        }
        metadata = ToolMetadata(
            name="search",
            description="Search",
            parameters=params,
            requires_approval=True,
            category="web",
        )
        assert len(metadata.parameters) == 1
        assert metadata.requires_approval is True
        assert metadata.category == "web"


class TestHookMetadata:
    """Tests for HookMetadata dataclass"""
    
    def test_create_hook_metadata(self):
        """Test creating HookMetadata"""
        metadata = HookMetadata(
            hook_name="on_agent_step",
            priority=10,
            is_async=True,
        )
        assert metadata.hook_name == "on_agent_step"
        assert metadata.priority == 10
        assert metadata.is_async is True
    
    def test_hook_metadata_defaults(self):
        """Test HookMetadata default values"""
        metadata = HookMetadata(hook_name="on_load")
        assert metadata.priority == 0
        assert metadata.is_async is False


class TestCommandMetadata:
    """Tests for CommandMetadata dataclass"""
    
    def test_create_command_metadata(self):
        """Test creating CommandMetadata"""
        metadata = CommandMetadata(
            name="search",
            description="Quick search",
            shortcut="Ctrl+Shift+S",
        )
        assert metadata.name == "search"
        assert metadata.description == "Quick search"
        assert metadata.shortcut == "Ctrl+Shift+S"
    
    def test_command_metadata_defaults(self):
        """Test CommandMetadata default values"""
        metadata = CommandMetadata(name="test")
        assert metadata.description == ""
        assert metadata.shortcut is None


class TestPluginAuthor:
    """Tests for PluginAuthor dataclass"""
    
    def test_create_plugin_author(self):
        """Test creating PluginAuthor"""
        author = PluginAuthor(
            name="John Doe",
            email="john@example.com",
            url="https://example.com",
        )
        assert author.name == "John Doe"
        assert author.email == "john@example.com"
        assert author.url == "https://example.com"
    
    def test_plugin_author_minimal(self):
        """Test PluginAuthor with only required fields"""
        author = PluginAuthor(name="Jane Doe")
        assert author.name == "Jane Doe"
        assert author.email is None
        assert author.url is None


class TestPluginManifest:
    """Tests for PluginManifest dataclass"""
    
    def test_create_plugin_manifest(self):
        """Test creating PluginManifest"""
        manifest = PluginManifest(
            id="my-plugin",
            name="My Plugin",
            version="1.0.0",
            description="A test plugin",
            plugin_type=PluginType.PYTHON,
            capabilities=[PluginCapability.TOOLS],
        )
        assert manifest.id == "my-plugin"
        assert manifest.name == "My Plugin"
        assert manifest.version == "1.0.0"
        assert manifest.plugin_type == PluginType.PYTHON
        assert PluginCapability.TOOLS in manifest.capabilities
    
    def test_manifest_to_dict(self):
        """Test converting manifest to dictionary"""
        manifest = PluginManifest(
            id="my-plugin",
            name="My Plugin",
            version="1.0.0",
            description="A test plugin",
            plugin_type=PluginType.PYTHON,
            capabilities=[PluginCapability.TOOLS, PluginCapability.HOOKS],
            python_dependencies=["requests>=2.28"],
            permissions=[PluginPermission.NETWORK_FETCH],
        )
        
        result = manifest.to_dict()
        
        assert result["id"] == "my-plugin"
        assert result["name"] == "My Plugin"
        assert result["version"] == "1.0.0"
        assert result["type"] == "python"
        assert "tools" in result["capabilities"]
        assert "hooks" in result["capabilities"]
        assert "requests>=2.28" in result["pythonDependencies"]
        assert "network:fetch" in result["permissions"]
    
    def test_manifest_to_dict_with_author(self):
        """Test manifest to_dict with author info"""
        manifest = PluginManifest(
            id="my-plugin",
            name="My Plugin",
            version="1.0.0",
            description="A test plugin",
            author=PluginAuthor(name="John Doe", email="john@example.com"),
        )
        
        result = manifest.to_dict()
        
        assert "author" in result
        assert result["author"]["name"] == "John Doe"
        assert result["author"]["email"] == "john@example.com"


class TestPluginContext:
    """Tests for PluginContext dataclass"""
    
    def test_create_plugin_context(self):
        """Test creating PluginContext"""
        context = PluginContext(
            plugin_id="test-plugin",
            plugin_path="/path/to/plugin",
            config={"key": "value"},
        )
        assert context.plugin_id == "test-plugin"
        assert context.plugin_path == "/path/to/plugin"
        assert context.config == {"key": "value"}
    
    def test_plugin_context_defaults(self):
        """Test PluginContext default values"""
        context = PluginContext(
            plugin_id="test",
            plugin_path="/test",
        )
        assert context.config == {}
    
    def test_log_debug(self, capsys):
        """Test log_debug method"""
        context = PluginContext(plugin_id="test", plugin_path="/test")
        context.log_debug("Debug message")
        captured = capsys.readouterr()
        assert "[DEBUG][test]" in captured.out
        assert "Debug message" in captured.out
    
    def test_log_info(self, capsys):
        """Test log_info method"""
        context = PluginContext(plugin_id="test", plugin_path="/test")
        context.log_info("Info message")
        captured = capsys.readouterr()
        assert "[INFO][test]" in captured.out
        assert "Info message" in captured.out
    
    def test_log_warn(self, capsys):
        """Test log_warn method"""
        context = PluginContext(plugin_id="test", plugin_path="/test")
        context.log_warn("Warning message")
        captured = capsys.readouterr()
        assert "[WARN][test]" in captured.out
        assert "Warning message" in captured.out
    
    def test_log_error(self, capsys):
        """Test log_error method"""
        context = PluginContext(plugin_id="test", plugin_path="/test")
        context.log_error("Error message")
        captured = capsys.readouterr()
        assert "[ERROR][test]" in captured.out
        assert "Error message" in captured.out


class TestToolContext:
    """Tests for ToolContext dataclass"""
    
    def test_create_tool_context(self):
        """Test creating ToolContext"""
        context = ToolContext(
            session_id="session-123",
            message_id="msg-456",
            config={"key": "value"},
        )
        assert context.session_id == "session-123"
        assert context.message_id == "msg-456"
        assert context.config == {"key": "value"}
    
    def test_tool_context_defaults(self):
        """Test ToolContext default values"""
        context = ToolContext()
        assert context.session_id is None
        assert context.message_id is None
        assert context.config == {}
    
    def test_report_progress(self):
        """Test report_progress method (placeholder)"""
        context = ToolContext()
        # Should not raise
        context.report_progress(0.5, "Halfway done")
