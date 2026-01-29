"""
Pytest configuration and fixtures for Cognia Plugin SDK tests
"""

import pytest
from typing import Any, Dict, List, Optional
from unittest.mock import AsyncMock, MagicMock

import sys
import os

# Add the src directory to the path for src layout
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from cognia import Plugin, PluginContext, ExtendedPluginContext
from cognia.context import (
    SessionAPI, ProjectAPI, VectorAPI, ThemeAPI, ExportAPI,
    CanvasAPI, ArtifactAPI, NotificationCenterAPI, AIProviderAPI,
    PermissionAPI, NetworkAPI, FileSystemAPI, ShellAPI, DatabaseAPI,
    ShortcutsAPI, ContextMenuAPI, StorageAPI, EventsAPI, UIAPI, SecretsAPI, I18nAPI,
)


@pytest.fixture
def plugin_context():
    """Create a basic plugin context for testing"""
    return PluginContext(
        plugin_id="test-plugin",
        plugin_path="/tmp/test-plugin",
        config={"test_key": "test_value"}
    )


@pytest.fixture
def mock_session_api():
    """Create a mock SessionAPI"""
    api = MagicMock(spec=SessionAPI)
    api.get_current_session.return_value = None
    api.get_current_session_id.return_value = "test-session-id"
    api.get_session = AsyncMock(return_value=None)
    api.create_session = AsyncMock()
    api.list_sessions = AsyncMock(return_value=[])
    api.get_messages = AsyncMock(return_value=[])
    api.add_message = AsyncMock()
    api.get_session_stats = AsyncMock()
    return api


@pytest.fixture
def mock_project_api():
    """Create a mock ProjectAPI"""
    api = MagicMock(spec=ProjectAPI)
    api.get_current_project.return_value = None
    api.get_current_project_id.return_value = None
    api.get_project = AsyncMock(return_value=None)
    api.create_project = AsyncMock()
    api.list_projects = AsyncMock(return_value=[])
    api.get_knowledge_files = AsyncMock(return_value=[])
    return api


@pytest.fixture
def mock_vector_api():
    """Create a mock VectorAPI"""
    api = MagicMock(spec=VectorAPI)
    api.create_collection = AsyncMock(return_value="collection-id")
    api.list_collections = AsyncMock(return_value=[])
    api.add_documents = AsyncMock(return_value=["doc-1", "doc-2"])
    api.search = AsyncMock(return_value=[])
    api.embed = AsyncMock(return_value=[0.1] * 1536)
    api.embed_batch = AsyncMock(return_value=[[0.1] * 1536])
    api.get_document_count = AsyncMock(return_value=0)
    return api


@pytest.fixture
def mock_theme_api():
    """Create a mock ThemeAPI"""
    from cognia import ThemeState, ThemeMode, ColorThemePreset, ThemeColors
    
    api = MagicMock(spec=ThemeAPI)
    api.get_theme.return_value = ThemeState(
        mode=ThemeMode.DARK,
        resolved_mode="dark",
        color_preset=ColorThemePreset.DEFAULT,
    )
    api.get_mode.return_value = ThemeMode.DARK
    api.get_resolved_mode.return_value = "dark"
    api.get_color_preset.return_value = ColorThemePreset.DEFAULT
    api.get_colors.return_value = ThemeColors()
    api.get_available_presets.return_value = list(ColorThemePreset)
    api.get_custom_themes.return_value = []
    api.register_custom_theme.return_value = "theme-id"
    return api


@pytest.fixture
def mock_network_api():
    """Create a mock NetworkAPI"""
    from cognia import NetworkResponse
    
    api = MagicMock(spec=NetworkAPI)
    mock_response = NetworkResponse(
        ok=True,
        status=200,
        status_text="OK",
        headers={"Content-Type": "application/json"},
        data={"result": "success"}
    )
    api.get = AsyncMock(return_value=mock_response)
    api.post = AsyncMock(return_value=mock_response)
    api.put = AsyncMock(return_value=mock_response)
    api.delete = AsyncMock(return_value=mock_response)
    api.patch = AsyncMock(return_value=mock_response)
    api.fetch = AsyncMock(return_value=mock_response)
    return api


@pytest.fixture
def mock_storage_api():
    """Create a mock StorageAPI"""
    storage = {}
    
    api = MagicMock(spec=StorageAPI)
    
    async def mock_get(key):
        return storage.get(key)
    
    async def mock_set(key, value):
        storage[key] = value
    
    async def mock_delete(key):
        storage.pop(key, None)
    
    async def mock_keys():
        return list(storage.keys())
    
    async def mock_clear():
        storage.clear()
    
    api.get = AsyncMock(side_effect=mock_get)
    api.set = AsyncMock(side_effect=mock_set)
    api.delete = AsyncMock(side_effect=mock_delete)
    api.keys = AsyncMock(side_effect=mock_keys)
    api.clear = AsyncMock(side_effect=mock_clear)
    api._storage = storage  # Expose for testing
    return api


@pytest.fixture
def mock_notifications_api():
    """Create a mock NotificationCenterAPI"""
    from cognia import NotificationOptions
    
    api = MagicMock(spec=NotificationCenterAPI)
    api.create.return_value = "notification-id"
    api.get_all.return_value = []
    return api


@pytest.fixture
def mock_fs_api():
    """Create a mock FileSystemAPI"""
    from cognia import FileEntry, FileStat
    
    api = MagicMock(spec=FileSystemAPI)
    api.read_text = AsyncMock(return_value="file content")
    api.read_binary = AsyncMock(return_value=b"binary content")
    api.read_json = AsyncMock(return_value={"key": "value"})
    api.write_text = AsyncMock()
    api.write_binary = AsyncMock()
    api.write_json = AsyncMock()
    api.exists = AsyncMock(return_value=True)
    api.mkdir = AsyncMock()
    api.remove = AsyncMock()
    api.read_dir = AsyncMock(return_value=[])
    api.stat = AsyncMock(return_value=FileStat(
        size=1024,
        is_file=True,
        is_directory=False,
    ))
    api.get_data_dir.return_value = "/tmp/plugin-data"
    api.get_cache_dir.return_value = "/tmp/plugin-cache"
    api.get_temp_dir.return_value = "/tmp"
    return api


@pytest.fixture
def extended_context(
    plugin_context,
    mock_session_api,
    mock_project_api,
    mock_vector_api,
    mock_theme_api,
    mock_network_api,
    mock_storage_api,
    mock_notifications_api,
    mock_fs_api,
):
    """Create an ExtendedPluginContext with mock APIs"""
    return ExtendedPluginContext(
        plugin_id=plugin_context.plugin_id,
        plugin_path=plugin_context.plugin_path,
        config=plugin_context.config,
        session=mock_session_api,
        project=mock_project_api,
        vector=mock_vector_api,
        theme=mock_theme_api,
        network=mock_network_api,
        storage=mock_storage_api,
        notifications=mock_notifications_api,
        fs=mock_fs_api,
    )


class SamplePlugin(Plugin):
    """Sample plugin for testing"""
    name = "sample-plugin"
    version = "1.0.0"
    description = "A sample plugin for testing"
    capabilities = ["tools", "hooks"]
    permissions = ["network:fetch"]


@pytest.fixture
def sample_plugin(plugin_context):
    """Create a sample plugin instance"""
    return SamplePlugin(plugin_context)
