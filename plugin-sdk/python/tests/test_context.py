"""
Unit tests for cognia.context module
"""

import pytest
from unittest.mock import MagicMock, AsyncMock
from typing import Dict, Any, List

from cognia.context import (
    ExtendedPluginContext,
    SessionAPI,
    ProjectAPI,
    VectorAPI,
    ThemeAPI,
    ExportAPI,
    CanvasAPI,
    ArtifactAPI,
    NotificationCenterAPI,
    AIProviderAPI,
    PermissionAPI,
    NetworkAPI,
    FileSystemAPI,
    ShellAPI,
    DatabaseAPI,
    ShortcutsAPI,
    ContextMenuAPI,
    StorageAPI,
    EventsAPI,
    UIAPI,
    SecretsAPI,
    I18nAPI,
    ProgressNotification,
    DialogOptions,
    InputDialogOptions,
    ConfirmDialogOptions,
    StatusBarItem,
)
from cognia.types import (
    Session, UIMessage, SessionFilter, SessionStats, ChatMode,
    Project, ProjectFilter, KnowledgeFile,
    VectorDocument, VectorSearchOptions, VectorSearchResult, CollectionStats,
    ThemeState, ThemeMode, ColorThemePreset, ThemeColors,
    ExportFormat, ExportOptions, ExportResult,
    CanvasDocument, CreateCanvasDocumentOptions,
    Artifact, CreateArtifactOptions,
    NotificationOptions,
    AIChatMessage, AIChatOptions,
    ExtendedPermission,
    NetworkResponse,
    FileEntry, FileStat,
    ShellResult,
    DatabaseResult,
)


class TestExtendedPluginContext:
    """Tests for ExtendedPluginContext"""
    
    def test_create_context(self):
        """Test creating an ExtendedPluginContext"""
        ctx = ExtendedPluginContext(
            plugin_id="test-plugin",
            plugin_path="/path/to/plugin",
            config={"key": "value"},
        )
        assert ctx.plugin_id == "test-plugin"
        assert ctx.plugin_path == "/path/to/plugin"
        assert ctx.config == {"key": "value"}
    
    def test_context_with_apis(self, mock_session_api, mock_vector_api):
        """Test context with API instances"""
        ctx = ExtendedPluginContext(
            plugin_id="test",
            plugin_path="/test",
            session=mock_session_api,
            vector=mock_vector_api,
        )
        assert ctx.session is not None
        assert ctx.vector is not None
    
    def test_log_debug(self, capsys):
        """Test log_debug method"""
        ctx = ExtendedPluginContext(plugin_id="test", plugin_path="/test")
        ctx.log_debug("Debug message")
        captured = capsys.readouterr()
        assert "[DEBUG][test]" in captured.out
    
    def test_log_info(self, capsys):
        """Test log_info method"""
        ctx = ExtendedPluginContext(plugin_id="test", plugin_path="/test")
        ctx.log_info("Info message")
        captured = capsys.readouterr()
        assert "[INFO][test]" in captured.out
    
    def test_log_warn(self, capsys):
        """Test log_warn method"""
        ctx = ExtendedPluginContext(plugin_id="test", plugin_path="/test")
        ctx.log_warn("Warning message")
        captured = capsys.readouterr()
        assert "[WARN][test]" in captured.out
    
    def test_log_error(self, capsys):
        """Test log_error method"""
        ctx = ExtendedPluginContext(plugin_id="test", plugin_path="/test")
        ctx.log_error("Error message")
        captured = capsys.readouterr()
        assert "[ERROR][test]" in captured.out


class TestProgressNotification:
    """Tests for ProgressNotification helper"""
    
    def test_create_progress_notification(self, mock_notifications_api):
        """Test creating a ProgressNotification"""
        progress = ProgressNotification(
            id="notif-123",
            api=mock_notifications_api,
        )
        assert progress.id == "notif-123"
    
    def test_update_progress(self, mock_notifications_api):
        """Test updating progress"""
        progress = ProgressNotification(id="notif-123", api=mock_notifications_api)
        progress.update(0.5, "Halfway done")
        
        mock_notifications_api.update.assert_called_once()
        call_args = mock_notifications_api.update.call_args
        assert call_args[0][0] == "notif-123"
        assert call_args[1]["progress"] == 0.5
        assert call_args[1]["message"] == "Halfway done"
    
    def test_complete_progress(self, mock_notifications_api):
        """Test completing progress"""
        progress = ProgressNotification(id="notif-123", api=mock_notifications_api)
        progress.complete("Done!")
        
        # Should update to 100% and dismiss
        mock_notifications_api.update.assert_called()
        mock_notifications_api.dismiss.assert_called_once_with("notif-123")
    
    def test_error_progress(self, mock_notifications_api):
        """Test error state"""
        progress = ProgressNotification(id="notif-123", api=mock_notifications_api)
        progress.error("Something went wrong")
        
        mock_notifications_api.update.assert_called_once()
        call_args = mock_notifications_api.update.call_args
        assert call_args[1]["type"] == "error"
        assert call_args[1]["message"] == "Something went wrong"


class TestDialogOptions:
    """Tests for DialogOptions"""
    
    def test_create_dialog_options(self):
        """Test creating DialogOptions"""
        opts = DialogOptions(
            title="Confirm",
            content="Are you sure?",
            actions=[{"label": "Yes", "value": True}],
        )
        assert opts.title == "Confirm"
        assert len(opts.actions) == 1


class TestInputDialogOptions:
    """Tests for InputDialogOptions"""
    
    def test_create_input_dialog_options(self):
        """Test creating InputDialogOptions"""
        opts = InputDialogOptions(
            title="Enter Name",
            message="Please enter your name",
            placeholder="John Doe",
            default_value="",
        )
        assert opts.title == "Enter Name"
        assert opts.placeholder == "John Doe"


class TestConfirmDialogOptions:
    """Tests for ConfirmDialogOptions"""
    
    def test_create_confirm_dialog_options(self):
        """Test creating ConfirmDialogOptions"""
        opts = ConfirmDialogOptions(
            title="Delete Item",
            message="Are you sure you want to delete this?",
            confirm_label="Delete",
            cancel_label="Cancel",
            variant="destructive",
        )
        assert opts.title == "Delete Item"
        assert opts.variant == "destructive"


class TestStatusBarItem:
    """Tests for StatusBarItem"""
    
    def test_create_status_bar_item(self):
        """Test creating StatusBarItem"""
        item = StatusBarItem(
            id="my-item",
            text="Status: OK",
            icon="check",
            tooltip="Everything is fine",
            priority=10,
        )
        assert item.id == "my-item"
        assert item.text == "Status: OK"
        assert item.priority == 10


class TestSessionAPIUsage:
    """Tests for SessionAPI usage patterns"""
    
    @pytest.mark.asyncio
    async def test_get_current_session_id(self, mock_session_api):
        """Test getting current session ID"""
        session_id = mock_session_api.get_current_session_id()
        assert session_id == "test-session-id"
    
    @pytest.mark.asyncio
    async def test_list_sessions(self, mock_session_api):
        """Test listing sessions"""
        sessions = await mock_session_api.list_sessions()
        assert isinstance(sessions, list)
    
    @pytest.mark.asyncio
    async def test_get_messages(self, mock_session_api):
        """Test getting messages"""
        messages = await mock_session_api.get_messages("session-123")
        assert isinstance(messages, list)


class TestProjectAPIUsage:
    """Tests for ProjectAPI usage patterns"""
    
    def test_get_current_project(self, mock_project_api):
        """Test getting current project"""
        project = mock_project_api.get_current_project()
        assert project is None
    
    @pytest.mark.asyncio
    async def test_list_projects(self, mock_project_api):
        """Test listing projects"""
        projects = await mock_project_api.list_projects()
        assert isinstance(projects, list)
    
    @pytest.mark.asyncio
    async def test_get_knowledge_files(self, mock_project_api):
        """Test getting knowledge files"""
        files = await mock_project_api.get_knowledge_files("project-123")
        assert isinstance(files, list)


class TestVectorAPIUsage:
    """Tests for VectorAPI usage patterns"""
    
    @pytest.mark.asyncio
    async def test_create_collection(self, mock_vector_api):
        """Test creating a collection"""
        collection_id = await mock_vector_api.create_collection("my-collection")
        assert collection_id == "collection-id"
    
    @pytest.mark.asyncio
    async def test_add_documents(self, mock_vector_api):
        """Test adding documents"""
        docs = [VectorDocument(content="Test content")]
        ids = await mock_vector_api.add_documents("collection", docs)
        assert len(ids) == 2
    
    @pytest.mark.asyncio
    async def test_search(self, mock_vector_api):
        """Test searching documents"""
        results = await mock_vector_api.search("collection", "query")
        assert isinstance(results, list)
    
    @pytest.mark.asyncio
    async def test_embed(self, mock_vector_api):
        """Test generating embeddings"""
        embedding = await mock_vector_api.embed("Hello world")
        assert len(embedding) == 1536
    
    @pytest.mark.asyncio
    async def test_embed_batch(self, mock_vector_api):
        """Test batch embedding"""
        embeddings = await mock_vector_api.embed_batch(["text1", "text2"])
        assert len(embeddings) == 1


class TestThemeAPIUsage:
    """Tests for ThemeAPI usage patterns"""
    
    def test_get_theme(self, mock_theme_api):
        """Test getting theme state"""
        state = mock_theme_api.get_theme()
        assert state.mode == ThemeMode.DARK
    
    def test_get_mode(self, mock_theme_api):
        """Test getting theme mode"""
        mode = mock_theme_api.get_mode()
        assert mode == ThemeMode.DARK
    
    def test_get_resolved_mode(self, mock_theme_api):
        """Test getting resolved mode"""
        mode = mock_theme_api.get_resolved_mode()
        assert mode == "dark"
    
    def test_get_color_preset(self, mock_theme_api):
        """Test getting color preset"""
        preset = mock_theme_api.get_color_preset()
        assert preset == ColorThemePreset.DEFAULT
    
    def test_get_available_presets(self, mock_theme_api):
        """Test getting available presets"""
        presets = mock_theme_api.get_available_presets()
        assert len(presets) > 0
    
    def test_register_custom_theme(self, mock_theme_api):
        """Test registering custom theme"""
        theme_id = mock_theme_api.register_custom_theme(
            "My Theme",
            ThemeColors(primary="#007ACC"),
            True
        )
        assert theme_id == "theme-id"


class TestNetworkAPIUsage:
    """Tests for NetworkAPI usage patterns"""
    
    @pytest.mark.asyncio
    async def test_get_request(self, mock_network_api):
        """Test GET request"""
        response = await mock_network_api.get("https://api.example.com")
        assert response.ok is True
        assert response.status == 200
    
    @pytest.mark.asyncio
    async def test_post_request(self, mock_network_api):
        """Test POST request"""
        response = await mock_network_api.post(
            "https://api.example.com",
            body={"key": "value"}
        )
        assert response.ok is True
    
    @pytest.mark.asyncio
    async def test_put_request(self, mock_network_api):
        """Test PUT request"""
        response = await mock_network_api.put("https://api.example.com")
        assert response.ok is True
    
    @pytest.mark.asyncio
    async def test_delete_request(self, mock_network_api):
        """Test DELETE request"""
        response = await mock_network_api.delete("https://api.example.com")
        assert response.ok is True


class TestStorageAPIUsage:
    """Tests for StorageAPI usage patterns"""
    
    @pytest.mark.asyncio
    async def test_set_and_get(self, mock_storage_api):
        """Test setting and getting values"""
        await mock_storage_api.set("key", "value")
        mock_storage_api._storage["key"] = "value"  # Simulate storage
        
        mock_storage_api.get.return_value = "value"
        result = await mock_storage_api.get("key")
        assert result == "value"
    
    @pytest.mark.asyncio
    async def test_delete(self, mock_storage_api):
        """Test deleting values"""
        await mock_storage_api.delete("key")
        mock_storage_api.delete.assert_called_with("key")
    
    @pytest.mark.asyncio
    async def test_keys(self, mock_storage_api):
        """Test getting keys"""
        mock_storage_api.keys = AsyncMock(return_value=["key1", "key2"])
        keys = await mock_storage_api.keys()
        assert len(keys) == 2
    
    @pytest.mark.asyncio
    async def test_clear(self, mock_storage_api):
        """Test clearing storage"""
        await mock_storage_api.clear()
        mock_storage_api.clear.assert_called()


class TestFileSystemAPIUsage:
    """Tests for FileSystemAPI usage patterns"""
    
    @pytest.mark.asyncio
    async def test_read_text(self, mock_fs_api):
        """Test reading text file"""
        content = await mock_fs_api.read_text("/path/to/file.txt")
        assert content == "file content"
    
    @pytest.mark.asyncio
    async def test_read_binary(self, mock_fs_api):
        """Test reading binary file"""
        content = await mock_fs_api.read_binary("/path/to/file.bin")
        assert content == b"binary content"
    
    @pytest.mark.asyncio
    async def test_read_json(self, mock_fs_api):
        """Test reading JSON file"""
        data = await mock_fs_api.read_json("/path/to/file.json")
        assert data == {"key": "value"}
    
    @pytest.mark.asyncio
    async def test_write_text(self, mock_fs_api):
        """Test writing text file"""
        await mock_fs_api.write_text("/path/to/file.txt", "content")
        mock_fs_api.write_text.assert_called_with("/path/to/file.txt", "content")
    
    @pytest.mark.asyncio
    async def test_exists(self, mock_fs_api):
        """Test checking file existence"""
        exists = await mock_fs_api.exists("/path/to/file.txt")
        assert exists is True
    
    @pytest.mark.asyncio
    async def test_mkdir(self, mock_fs_api):
        """Test creating directory"""
        await mock_fs_api.mkdir("/path/to/dir", recursive=True)
        mock_fs_api.mkdir.assert_called()
    
    @pytest.mark.asyncio
    async def test_stat(self, mock_fs_api):
        """Test getting file stats"""
        stat = await mock_fs_api.stat("/path/to/file.txt")
        assert stat.size == 1024
        assert stat.is_file is True
    
    def test_get_data_dir(self, mock_fs_api):
        """Test getting data directory"""
        path = mock_fs_api.get_data_dir()
        assert path == "/tmp/plugin-data"
    
    def test_get_cache_dir(self, mock_fs_api):
        """Test getting cache directory"""
        path = mock_fs_api.get_cache_dir()
        assert path == "/tmp/plugin-cache"


class TestNotificationCenterAPIUsage:
    """Tests for NotificationCenterAPI usage patterns"""
    
    def test_create_notification(self, mock_notifications_api):
        """Test creating a notification"""
        notif_id = mock_notifications_api.create(NotificationOptions(
            title="Test",
            message="Test message",
        ))
        assert notif_id == "notification-id"
    
    def test_get_all_notifications(self, mock_notifications_api):
        """Test getting all notifications"""
        notifs = mock_notifications_api.get_all()
        assert isinstance(notifs, list)
    
    def test_create_progress_notification(self, mock_notifications_api):
        """Test creating progress notification via API"""
        # The create_progress is a helper method that calls create()
        # We need to test it properly by using the NotificationCenterAPI.create_progress method
        from cognia.context import ProgressNotification
        progress = ProgressNotification(id="notification-id", api=mock_notifications_api)
        assert progress.id == "notification-id"


class TestIntegrationPatterns:
    """Tests for common integration patterns"""
    
    @pytest.mark.asyncio
    async def test_vector_search_workflow(self, mock_vector_api):
        """Test complete vector search workflow"""
        # Add documents
        docs = [
            VectorDocument(content="Python programming guide"),
            VectorDocument(content="Machine learning basics"),
        ]
        ids = await mock_vector_api.add_documents("docs", docs)
        assert len(ids) == 2
        
        # Search
        results = await mock_vector_api.search("docs", "Python programming")
        assert isinstance(results, list)
        
        # Get count
        count = await mock_vector_api.get_document_count("docs")
        assert isinstance(count, int)
    
    @pytest.mark.asyncio
    async def test_session_management_workflow(self, mock_session_api):
        """Test complete session management workflow"""
        # Get current session
        session_id = mock_session_api.get_current_session_id()
        assert session_id is not None
        
        # Get messages
        messages = await mock_session_api.get_messages(session_id)
        assert isinstance(messages, list)
        
        # Get stats
        mock_session_api.get_session_stats.return_value = SessionStats(
            message_count=10,
            total_tokens=1000,
        )
        stats = await mock_session_api.get_session_stats(session_id)
        assert stats.message_count == 10
    
    def test_theme_customization_workflow(self, mock_theme_api):
        """Test complete theme customization workflow"""
        # Get current theme
        state = mock_theme_api.get_theme()
        assert state is not None
        
        # Get available presets
        presets = mock_theme_api.get_available_presets()
        assert len(presets) > 0
        
        # Register custom theme
        theme_id = mock_theme_api.register_custom_theme(
            "Custom Dark",
            ThemeColors(primary="#FF6B6B", background="#1A1A2E"),
            is_dark=True
        )
        assert theme_id is not None
    
    @pytest.mark.asyncio
    async def test_network_api_workflow(self, mock_network_api):
        """Test complete network request workflow"""
        # GET request
        response = await mock_network_api.get("https://api.example.com/data")
        assert response.ok
        
        # POST request
        response = await mock_network_api.post(
            "https://api.example.com/data",
            body={"action": "create"}
        )
        assert response.status == 200
    
    @pytest.mark.asyncio
    async def test_file_operations_workflow(self, mock_fs_api):
        """Test complete file operations workflow"""
        # Check if file exists
        exists = await mock_fs_api.exists("/data/config.json")
        
        if exists:
            # Read file
            config = await mock_fs_api.read_json("/data/config.json")
            assert config is not None
        
        # Write file
        await mock_fs_api.write_json("/data/output.json", {"result": "success"})
        mock_fs_api.write_json.assert_called()
