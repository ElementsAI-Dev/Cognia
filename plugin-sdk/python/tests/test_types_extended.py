"""
Unit tests for cognia.types module (extended types)
"""

import pytest
from datetime import datetime
from cognia.types import (
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
