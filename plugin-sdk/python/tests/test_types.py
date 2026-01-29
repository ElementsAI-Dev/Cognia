"""
Unit tests for cognia.types module
"""

import pytest
from datetime import datetime
from cognia.types import (
    # Core types
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
    # Session types
    ChatMode, Session, UIMessage, SessionFilter, MessageQueryOptions,
    SendMessageOptions, SessionStats, MessageAttachment,
    # Project types
    Project, ProjectFilter, ProjectFileInput, KnowledgeFile,
    # Vector types
    VectorDocument, VectorFilter, VectorSearchOptions, VectorSearchResult,
    CollectionOptions, CollectionStats,
    # Theme types
    ThemeMode, ColorThemePreset, ThemeColors, CustomTheme, ThemeState,
    # Export types
    ExportFormat, ExportOptions, ExportResult,
    # Canvas types
    CanvasDocument, CreateCanvasDocumentOptions, CanvasSelection, CanvasDocumentVersion,
    # Artifact types
    Artifact, CreateArtifactOptions, ArtifactFilter,
    # Notification types
    NotificationOptions, Notification, NotificationAction,
    # AI types
    AIChatMessage, AIChatOptions, AIChatChunk, AIModel,
    # Extension types
    ExtensionPoint, ExtensionOptions,
    # Permission types
    ExtendedPermission,
    # Network types
    NetworkRequestOptions, NetworkResponse, DownloadProgress, DownloadResult,
    # File types
    FileEntry, FileStat, FileWatchEvent,
    # Shell types
    ShellOptions, ShellResult,
    # Database types
    DatabaseResult, TableSchema, TableColumn, TableIndex,
    # Context Menu types
    ContextMenuItem, ContextMenuClickContext, ContextMenuContext,
    # Shortcut types
    ShortcutOptions, ShortcutRegistration,
    # Window types
    WindowOptions,
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


class TestChatMode:
    """Tests for ChatMode enum"""
    
    def test_chat_mode_values(self):
        """Test ChatMode enum values"""
        assert ChatMode.NORMAL.value == "normal"
        assert ChatMode.AGENT.value == "agent"
        assert ChatMode.CANVAS.value == "canvas"


class TestSession:
    """Tests for Session dataclass"""
    
    def test_create_session(self):
        """Test creating a Session"""
        session = Session(
            id="session-123",
            title="Test Session",
            mode=ChatMode.NORMAL,
        )
        assert session.id == "session-123"
        assert session.title == "Test Session"
        assert session.mode == ChatMode.NORMAL
        assert session.project_id is None
    
    def test_session_with_all_fields(self):
        """Test Session with all fields"""
        now = datetime.now()
        session = Session(
            id="session-123",
            title="Test",
            mode=ChatMode.AGENT,
            project_id="project-456",
            created_at=now,
            updated_at=now,
            metadata={"key": "value"},
        )
        assert session.project_id == "project-456"
        assert session.created_at == now
        assert session.metadata == {"key": "value"}


class TestUIMessage:
    """Tests for UIMessage dataclass"""
    
    def test_create_message(self):
        """Test creating a UIMessage"""
        msg = UIMessage(
            id="msg-123",
            role="user",
            content="Hello, world!",
        )
        assert msg.id == "msg-123"
        assert msg.role == "user"
        assert msg.content == "Hello, world!"


class TestSessionFilter:
    """Tests for SessionFilter dataclass"""
    
    def test_filter_defaults(self):
        """Test SessionFilter default values"""
        filter = SessionFilter()
        assert filter.project_id is None
        assert filter.mode is None
        assert filter.limit is None
    
    def test_filter_with_values(self):
        """Test SessionFilter with values"""
        filter = SessionFilter(
            project_id="project-123",
            mode=ChatMode.AGENT,
            has_messages=True,
            limit=20,
            sort_by="updatedAt",
            sort_order="desc",
        )
        assert filter.project_id == "project-123"
        assert filter.mode == ChatMode.AGENT
        assert filter.limit == 20


class TestSessionStats:
    """Tests for SessionStats dataclass"""
    
    def test_stats_defaults(self):
        """Test SessionStats default values"""
        stats = SessionStats()
        assert stats.message_count == 0
        assert stats.total_tokens == 0
    
    def test_stats_with_values(self):
        """Test SessionStats with values"""
        stats = SessionStats(
            message_count=100,
            user_message_count=50,
            assistant_message_count=50,
            total_tokens=5000,
            average_response_time=2.5,
        )
        assert stats.message_count == 100
        assert stats.average_response_time == 2.5


class TestVectorDocument:
    """Tests for VectorDocument dataclass"""
    
    def test_create_document(self):
        """Test creating a VectorDocument"""
        doc = VectorDocument(
            content="This is the document content",
            metadata={"source": "web"},
        )
        assert doc.content == "This is the document content"
        assert doc.metadata == {"source": "web"}
        assert doc.id is None
        assert doc.embedding is None
    
    def test_document_with_embedding(self):
        """Test VectorDocument with embedding"""
        embedding = [0.1] * 1536
        doc = VectorDocument(
            id="doc-123",
            content="Content",
            embedding=embedding,
        )
        assert doc.id == "doc-123"
        assert len(doc.embedding) == 1536


class TestVectorSearchOptions:
    """Tests for VectorSearchOptions dataclass"""
    
    def test_search_options_defaults(self):
        """Test VectorSearchOptions default values"""
        opts = VectorSearchOptions()
        assert opts.top_k == 10
        assert opts.threshold is None
        assert opts.filter_mode == "and"
    
    def test_search_options_with_filters(self):
        """Test VectorSearchOptions with filters"""
        filters = [VectorFilter(key="type", value="code", operation="eq")]
        opts = VectorSearchOptions(
            top_k=5,
            threshold=0.8,
            filters=filters,
            include_metadata=True,
        )
        assert opts.top_k == 5
        assert len(opts.filters) == 1


class TestVectorSearchResult:
    """Tests for VectorSearchResult dataclass"""
    
    def test_create_result(self):
        """Test creating a VectorSearchResult"""
        result = VectorSearchResult(
            id="doc-123",
            content="Result content",
            score=0.95,
            metadata={"source": "docs"},
        )
        assert result.id == "doc-123"
        assert result.score == 0.95
        assert result.metadata == {"source": "docs"}


class TestThemeMode:
    """Tests for ThemeMode enum"""
    
    def test_theme_mode_values(self):
        """Test ThemeMode enum values"""
        assert ThemeMode.LIGHT.value == "light"
        assert ThemeMode.DARK.value == "dark"
        assert ThemeMode.SYSTEM.value == "system"


class TestColorThemePreset:
    """Tests for ColorThemePreset enum"""
    
    def test_preset_values(self):
        """Test ColorThemePreset enum values"""
        assert ColorThemePreset.DEFAULT.value == "default"
        assert ColorThemePreset.OCEAN.value == "ocean"
        assert ColorThemePreset.FOREST.value == "forest"
        assert ColorThemePreset.SUNSET.value == "sunset"


class TestThemeColors:
    """Tests for ThemeColors dataclass"""
    
    def test_theme_colors_defaults(self):
        """Test ThemeColors default values"""
        colors = ThemeColors()
        assert colors.primary == ""
        assert colors.background == ""
    
    def test_theme_colors_with_values(self):
        """Test ThemeColors with values"""
        colors = ThemeColors(
            primary="#007ACC",
            primary_foreground="#FFFFFF",
            background="#1E1E1E",
            foreground="#CCCCCC",
        )
        assert colors.primary == "#007ACC"
        assert colors.background == "#1E1E1E"


class TestThemeState:
    """Tests for ThemeState dataclass"""
    
    def test_create_theme_state(self):
        """Test creating a ThemeState"""
        state = ThemeState(
            mode=ThemeMode.DARK,
            resolved_mode="dark",
            color_preset=ColorThemePreset.DEFAULT,
        )
        assert state.mode == ThemeMode.DARK
        assert state.resolved_mode == "dark"
        assert state.custom_theme_id is None


class TestExportFormat:
    """Tests for ExportFormat enum"""
    
    def test_export_format_values(self):
        """Test ExportFormat enum values"""
        assert ExportFormat.MARKDOWN.value == "markdown"
        assert ExportFormat.JSON.value == "json"
        assert ExportFormat.HTML.value == "html"
        assert ExportFormat.PDF.value == "pdf"


class TestExportOptions:
    """Tests for ExportOptions dataclass"""
    
    def test_export_options(self):
        """Test creating ExportOptions"""
        opts = ExportOptions(
            format=ExportFormat.MARKDOWN,
            show_timestamps=True,
            include_metadata=True,
        )
        assert opts.format == ExportFormat.MARKDOWN
        assert opts.show_timestamps is True


class TestAIChatMessage:
    """Tests for AIChatMessage dataclass"""
    
    def test_create_message(self):
        """Test creating an AIChatMessage"""
        msg = AIChatMessage(
            role="user",
            content="Hello!",
        )
        assert msg.role == "user"
        assert msg.content == "Hello!"
        assert msg.name is None


class TestAIModel:
    """Tests for AIModel dataclass"""
    
    def test_create_model(self):
        """Test creating an AIModel"""
        model = AIModel(
            id="gpt-4",
            name="GPT-4",
            provider="openai",
            context_length=128000,
            capabilities=["chat", "function_calling"],
        )
        assert model.id == "gpt-4"
        assert model.context_length == 128000
        assert "chat" in model.capabilities


class TestExtensionPoint:
    """Tests for ExtensionPoint enum"""
    
    def test_extension_point_values(self):
        """Test ExtensionPoint enum values"""
        assert ExtensionPoint.SIDEBAR_LEFT_TOP.value == "sidebar.left.top"
        assert ExtensionPoint.TOOLBAR_CENTER.value == "toolbar.center"
        assert ExtensionPoint.CHAT_INPUT_ACTIONS.value == "chat.input.actions"


class TestExtendedPermission:
    """Tests for ExtendedPermission enum"""
    
    def test_permission_values(self):
        """Test ExtendedPermission enum values"""
        assert ExtendedPermission.SESSION_READ.value == "session:read"
        assert ExtendedPermission.VECTOR_WRITE.value == "vector:write"
        assert ExtendedPermission.AI_CHAT.value == "ai:chat"


class TestNetworkTypes:
    """Tests for Network-related types"""
    
    def test_network_request_options(self):
        """Test NetworkRequestOptions dataclass"""
        opts = NetworkRequestOptions(
            method="POST",
            headers={"Content-Type": "application/json"},
            timeout=30,
        )
        assert opts.method == "POST"
        assert opts.headers == {"Content-Type": "application/json"}
    
    def test_network_response(self):
        """Test NetworkResponse dataclass"""
        resp = NetworkResponse(
            ok=True,
            status=200,
            status_text="OK",
            headers={"Content-Type": "application/json"},
            data={"result": "success"},
        )
        assert resp.ok is True
        assert resp.status == 200
        assert resp.data == {"result": "success"}
    
    def test_download_progress(self):
        """Test DownloadProgress dataclass"""
        progress = DownloadProgress(
            loaded=5000,
            total=10000,
            percent=0.5,
        )
        assert progress.percent == 0.5


class TestFileSystemTypes:
    """Tests for File System related types"""
    
    def test_file_entry(self):
        """Test FileEntry dataclass"""
        entry = FileEntry(
            name="test.txt",
            path="/path/to/test.txt",
            is_file=True,
            is_directory=False,
            size=1024,
        )
        assert entry.name == "test.txt"
        assert entry.is_file is True
    
    def test_file_stat(self):
        """Test FileStat dataclass"""
        stat = FileStat(
            size=2048,
            is_file=True,
            is_directory=False,
        )
        assert stat.size == 2048
    
    def test_file_watch_event(self):
        """Test FileWatchEvent dataclass"""
        event = FileWatchEvent(
            type="modify",
            path="/path/to/file.txt",
        )
        assert event.type == "modify"


class TestShellTypes:
    """Tests for Shell related types"""
    
    def test_shell_options(self):
        """Test ShellOptions dataclass"""
        opts = ShellOptions(
            cwd="/home/user",
            timeout=60,
        )
        assert opts.cwd == "/home/user"
        assert opts.timeout == 60
    
    def test_shell_result(self):
        """Test ShellResult dataclass"""
        result = ShellResult(
            code=0,
            stdout="Hello",
            stderr="",
            success=True,
        )
        assert result.success is True
        assert result.code == 0


class TestDatabaseTypes:
    """Tests for Database related types"""
    
    def test_database_result(self):
        """Test DatabaseResult dataclass"""
        result = DatabaseResult(
            rows_affected=5,
            last_insert_id=100,
        )
        assert result.rows_affected == 5
    
    def test_table_column(self):
        """Test TableColumn dataclass"""
        col = TableColumn(
            name="id",
            type="integer",
            nullable=False,
            unique=True,
        )
        assert col.name == "id"
        assert col.nullable is False
    
    def test_table_schema(self):
        """Test TableSchema dataclass"""
        schema = TableSchema(
            columns=[
                TableColumn(name="id", type="integer"),
                TableColumn(name="name", type="text"),
            ],
            primary_key="id",
        )
        assert len(schema.columns) == 2


class TestContextMenuTypes:
    """Tests for Context Menu related types"""
    
    def test_context_menu_context(self):
        """Test ContextMenuContext enum"""
        assert ContextMenuContext.CHAT_MESSAGE.value == "chat:message"
        assert ContextMenuContext.ARTIFACT.value == "artifact"
    
    def test_context_menu_click_context(self):
        """Test ContextMenuClickContext dataclass"""
        ctx = ContextMenuClickContext(
            target=ContextMenuContext.CHAT_MESSAGE,
            message_id="msg-123",
        )
        assert ctx.target == ContextMenuContext.CHAT_MESSAGE
        assert ctx.message_id == "msg-123"


class TestNotificationTypes:
    """Tests for Notification related types"""
    
    def test_notification_action(self):
        """Test NotificationAction dataclass"""
        action = NotificationAction(
            label="View",
            action="view_action",
            variant="primary",
        )
        assert action.label == "View"
        assert action.variant == "primary"
    
    def test_notification_options(self):
        """Test NotificationOptions dataclass"""
        opts = NotificationOptions(
            title="Update Available",
            message="A new version is available",
            type="info",
            persistent=True,
        )
        assert opts.title == "Update Available"
        assert opts.persistent is True


class TestCanvasTypes:
    """Tests for Canvas related types"""
    
    def test_canvas_selection(self):
        """Test CanvasSelection dataclass"""
        sel = CanvasSelection(
            start=10,
            end=50,
            text="selected text",
        )
        assert sel.start == 10
        assert sel.end == 50
    
    def test_create_canvas_document_options(self):
        """Test CreateCanvasDocumentOptions dataclass"""
        opts = CreateCanvasDocumentOptions(
            title="My Document",
            content="Initial content",
            language="python",
            type="code",
        )
        assert opts.title == "My Document"
        assert opts.language == "python"


class TestArtifactTypes:
    """Tests for Artifact related types"""
    
    def test_create_artifact(self):
        """Test Artifact dataclass"""
        artifact = Artifact(
            id="art-123",
            title="My Code",
            content="print('hello')",
            language="python",
            type="code",
        )
        assert artifact.id == "art-123"
        assert artifact.type == "code"
    
    def test_artifact_filter(self):
        """Test ArtifactFilter dataclass"""
        filter = ArtifactFilter(
            session_id="session-123",
            language="python",
            limit=10,
        )
        assert filter.session_id == "session-123"


class TestWindowOptions:
    """Tests for WindowOptions dataclass"""
    
    def test_window_options(self):
        """Test WindowOptions dataclass"""
        opts = WindowOptions(
            title="My Window",
            width=1024,
            height=768,
            center=True,
            resizable=True,
        )
        assert opts.title == "My Window"
        assert opts.width == 1024
        assert opts.center is True
