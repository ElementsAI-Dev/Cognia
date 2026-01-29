"""
Runtime Context Implementation for Cognia Plugin SDK

Provides concrete implementations of the abstract API classes
that communicate with the Tauri backend via IPC.
"""

import asyncio
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Callable, Dict, List, Optional, TypeVar, Union
import logging

from .ipc import TauriIPC, get_ipc, IPCError
from .types import (
    Session, UIMessage, SessionFilter, MessageQueryOptions, SendMessageOptions, SessionStats,
    Project, ProjectFilter, ProjectFileInput, KnowledgeFile,
    VectorDocument, VectorSearchOptions, VectorSearchResult, CollectionOptions, CollectionStats,
    ThemeState, ThemeMode, ColorThemePreset, ThemeColors, CustomTheme,
    ExportOptions, ExportResult, ExportFormat,
    CanvasDocument, CreateCanvasDocumentOptions, CanvasSelection, CanvasDocumentVersion,
    Artifact, CreateArtifactOptions, ArtifactFilter,
    NotificationOptions, Notification, NotificationAction,
    AIChatMessage, AIChatOptions, AIChatChunk, AIModel,
    ExtensionPoint, ExtensionOptions,
    ExtendedPermission,
    NetworkRequestOptions, NetworkResponse, DownloadProgress, DownloadResult,
    FileEntry, FileStat, FileWatchEvent, ShellOptions, ShellResult,
    DatabaseResult, TableSchema,
    ContextMenuItem, ContextMenuClickContext,
    ShortcutOptions, ShortcutRegistration,
    WindowOptions,
)
from .context import (
    SessionAPI, ProjectAPI, VectorAPI, ThemeAPI, ExportAPI,
    CanvasAPI, ArtifactAPI, NotificationCenterAPI, AIProviderAPI,
    PermissionAPI, NetworkAPI, FileSystemAPI, ShellAPI, DatabaseAPI,
    ShortcutsAPI, ContextMenuAPI, StorageAPI, EventsAPI, UIAPI,
    SecretsAPI, I18nAPI, ExtendedPluginContext,
    ProgressNotification, DialogOptions, InputDialogOptions, ConfirmDialogOptions,
    StatusBarItem,
)

logger = logging.getLogger(__name__)

T = TypeVar('T')


def _to_dict(obj: Any) -> Any:
    """Convert dataclass to dict recursively"""
    if hasattr(obj, '__dataclass_fields__'):
        return {k: _to_dict(v) for k, v in obj.__dict__.items() if v is not None}
    elif isinstance(obj, list):
        return [_to_dict(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: _to_dict(v) for k, v in obj.items()}
    elif hasattr(obj, 'value'):  # Enum
        return obj.value
    return obj


def _from_dict(cls: type, data: Dict[str, Any]) -> Any:
    """Convert dict to dataclass"""
    if data is None:
        return None
    if not hasattr(cls, '__dataclass_fields__'):
        return data
    
    field_types = {f.name: f.type for f in cls.__dataclass_fields__.values()}
    kwargs = {}
    for key, value in data.items():
        # Convert camelCase to snake_case
        snake_key = ''.join(['_' + c.lower() if c.isupper() else c for c in key]).lstrip('_')
        if snake_key in field_types:
            kwargs[snake_key] = value
    return cls(**kwargs)


class RuntimeSessionAPI(SessionAPI):
    """Runtime implementation of Session API"""
    
    def __init__(self, ipc: TauriIPC):
        self._ipc = ipc
        self._current_session: Optional[Session] = None
        self._session_handlers: List[Callable] = []
        self._message_handlers: Dict[str, List[Callable]] = {}
    
    def get_current_session(self) -> Optional[Session]:
        return self._current_session
    
    def get_current_session_id(self) -> Optional[str]:
        return self._current_session.id if self._current_session else None
    
    async def get_session(self, session_id: str) -> Optional[Session]:
        result = await self._ipc.invoke("session_get", {"id": session_id})
        return _from_dict(Session, result) if result else None
    
    async def create_session(self, title: str = "", mode: str = "normal", **kwargs) -> Session:
        result = await self._ipc.invoke("session_create", {
            "title": title,
            "mode": mode,
            **kwargs
        })
        return _from_dict(Session, result)
    
    async def update_session(self, session_id: str, **updates) -> None:
        await self._ipc.invoke("session_update", {"id": session_id, **updates})
    
    async def switch_session(self, session_id: str) -> None:
        await self._ipc.invoke("session_switch", {"id": session_id})
        self._current_session = await self.get_session(session_id)
    
    async def delete_session(self, session_id: str) -> None:
        await self._ipc.invoke("session_delete", {"id": session_id})
    
    async def list_sessions(self, filter: Optional[SessionFilter] = None) -> List[Session]:
        result = await self._ipc.invoke("session_list", {
            "filter": _to_dict(filter) if filter else None
        })
        return [_from_dict(Session, s) for s in (result or [])]
    
    async def get_messages(self, session_id: str, options: Optional[MessageQueryOptions] = None) -> List[UIMessage]:
        result = await self._ipc.invoke("session_get_messages", {
            "sessionId": session_id,
            "options": _to_dict(options) if options else None
        })
        return [_from_dict(UIMessage, m) for m in (result or [])]
    
    async def add_message(self, session_id: str, content: str, options: Optional[SendMessageOptions] = None) -> UIMessage:
        result = await self._ipc.invoke("session_add_message", {
            "sessionId": session_id,
            "content": content,
            "options": _to_dict(options) if options else None
        })
        return _from_dict(UIMessage, result)
    
    async def update_message(self, session_id: str, message_id: str, **updates) -> None:
        await self._ipc.invoke("session_update_message", {
            "sessionId": session_id,
            "messageId": message_id,
            **updates
        })
    
    async def delete_message(self, session_id: str, message_id: str) -> None:
        await self._ipc.invoke("session_delete_message", {
            "sessionId": session_id,
            "messageId": message_id
        })
    
    def on_session_change(self, handler: Callable[[Optional[Session]], None]) -> Callable[[], None]:
        self._session_handlers.append(handler)
        return lambda: self._session_handlers.remove(handler)
    
    def on_messages_change(self, session_id: str, handler: Callable[[List[UIMessage]], None]) -> Callable[[], None]:
        if session_id not in self._message_handlers:
            self._message_handlers[session_id] = []
        self._message_handlers[session_id].append(handler)
        return lambda: self._message_handlers[session_id].remove(handler)
    
    async def get_session_stats(self, session_id: str) -> SessionStats:
        result = await self._ipc.invoke("session_get_stats", {"id": session_id})
        return _from_dict(SessionStats, result)


class RuntimeProjectAPI(ProjectAPI):
    """Runtime implementation of Project API"""
    
    def __init__(self, ipc: TauriIPC):
        self._ipc = ipc
        self._current_project: Optional[Project] = None
        self._project_handlers: List[Callable] = []
    
    def get_current_project(self) -> Optional[Project]:
        return self._current_project
    
    def get_current_project_id(self) -> Optional[str]:
        return self._current_project.id if self._current_project else None
    
    async def get_project(self, project_id: str) -> Optional[Project]:
        result = await self._ipc.invoke("project_get", {"id": project_id})
        return _from_dict(Project, result) if result else None
    
    async def create_project(self, name: str, description: str = "", **kwargs) -> Project:
        result = await self._ipc.invoke("project_create", {
            "name": name,
            "description": description,
            **kwargs
        })
        return _from_dict(Project, result)
    
    async def update_project(self, project_id: str, **updates) -> None:
        await self._ipc.invoke("project_update", {"id": project_id, **updates})
    
    async def delete_project(self, project_id: str) -> None:
        await self._ipc.invoke("project_delete", {"id": project_id})
    
    async def set_active_project(self, project_id: Optional[str]) -> None:
        await self._ipc.invoke("project_set_active", {"id": project_id})
        if project_id:
            self._current_project = await self.get_project(project_id)
        else:
            self._current_project = None
    
    async def list_projects(self, filter: Optional[ProjectFilter] = None) -> List[Project]:
        result = await self._ipc.invoke("project_list", {
            "filter": _to_dict(filter) if filter else None
        })
        return [_from_dict(Project, p) for p in (result or [])]
    
    async def archive_project(self, project_id: str) -> None:
        await self._ipc.invoke("project_archive", {"id": project_id})
    
    async def unarchive_project(self, project_id: str) -> None:
        await self._ipc.invoke("project_unarchive", {"id": project_id})
    
    async def add_knowledge_file(self, project_id: str, file: ProjectFileInput) -> KnowledgeFile:
        result = await self._ipc.invoke("project_add_file", {
            "projectId": project_id,
            "file": _to_dict(file)
        })
        return _from_dict(KnowledgeFile, result)
    
    async def remove_knowledge_file(self, project_id: str, file_id: str) -> None:
        await self._ipc.invoke("project_remove_file", {
            "projectId": project_id,
            "fileId": file_id
        })
    
    async def update_knowledge_file(self, project_id: str, file_id: str, content: str) -> None:
        await self._ipc.invoke("project_update_file", {
            "projectId": project_id,
            "fileId": file_id,
            "content": content
        })
    
    async def get_knowledge_files(self, project_id: str) -> List[KnowledgeFile]:
        result = await self._ipc.invoke("project_get_files", {"projectId": project_id})
        return [_from_dict(KnowledgeFile, f) for f in (result or [])]
    
    async def link_session(self, project_id: str, session_id: str) -> None:
        await self._ipc.invoke("project_link_session", {
            "projectId": project_id,
            "sessionId": session_id
        })
    
    async def unlink_session(self, project_id: str, session_id: str) -> None:
        await self._ipc.invoke("project_unlink_session", {
            "projectId": project_id,
            "sessionId": session_id
        })
    
    async def get_project_sessions(self, project_id: str) -> List[str]:
        result = await self._ipc.invoke("project_get_sessions", {"projectId": project_id})
        return result or []
    
    def on_project_change(self, handler: Callable[[Optional[Project]], None]) -> Callable[[], None]:
        self._project_handlers.append(handler)
        return lambda: self._project_handlers.remove(handler)
    
    async def add_tag(self, project_id: str, tag: str) -> None:
        await self._ipc.invoke("project_add_tag", {"projectId": project_id, "tag": tag})
    
    async def remove_tag(self, project_id: str, tag: str) -> None:
        await self._ipc.invoke("project_remove_tag", {"projectId": project_id, "tag": tag})


class RuntimeVectorAPI(VectorAPI):
    """Runtime implementation of Vector/RAG API"""
    
    def __init__(self, ipc: TauriIPC):
        self._ipc = ipc
    
    async def create_collection(self, name: str, options: Optional[CollectionOptions] = None) -> str:
        result = await self._ipc.invoke("vector_create_collection", {
            "name": name,
            "options": _to_dict(options) if options else None
        })
        return result
    
    async def delete_collection(self, name: str) -> None:
        await self._ipc.invoke("vector_delete_collection", {"name": name})
    
    async def list_collections(self) -> List[str]:
        result = await self._ipc.invoke("vector_list_collections")
        return result or []
    
    async def get_collection_info(self, name: str) -> CollectionStats:
        result = await self._ipc.invoke("vector_get_collection_info", {"name": name})
        return _from_dict(CollectionStats, result)
    
    async def add_documents(self, collection: str, docs: List[VectorDocument]) -> List[str]:
        result = await self._ipc.invoke("vector_add_documents", {
            "collection": collection,
            "documents": [_to_dict(d) for d in docs]
        })
        return result or []
    
    async def update_documents(self, collection: str, docs: List[VectorDocument]) -> None:
        await self._ipc.invoke("vector_update_documents", {
            "collection": collection,
            "documents": [_to_dict(d) for d in docs]
        })
    
    async def delete_documents(self, collection: str, ids: List[str]) -> None:
        await self._ipc.invoke("vector_delete_documents", {
            "collection": collection,
            "ids": ids
        })
    
    async def search(self, collection: str, query: str, options: Optional[VectorSearchOptions] = None) -> List[VectorSearchResult]:
        result = await self._ipc.invoke("vector_search", {
            "collection": collection,
            "query": query,
            "options": _to_dict(options) if options else None
        })
        return [_from_dict(VectorSearchResult, r) for r in (result or [])]
    
    async def search_by_embedding(self, collection: str, embedding: List[float], options: Optional[VectorSearchOptions] = None) -> List[VectorSearchResult]:
        result = await self._ipc.invoke("vector_search_by_embedding", {
            "collection": collection,
            "embedding": embedding,
            "options": _to_dict(options) if options else None
        })
        return [_from_dict(VectorSearchResult, r) for r in (result or [])]
    
    async def embed(self, text: str) -> List[float]:
        result = await self._ipc.invoke("vector_embed", {"text": text})
        return result or []
    
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        result = await self._ipc.invoke("vector_embed_batch", {"texts": texts})
        return result or []
    
    async def get_document_count(self, collection: str) -> int:
        result = await self._ipc.invoke("vector_get_document_count", {"collection": collection})
        return result or 0
    
    async def clear_collection(self, collection: str) -> None:
        await self._ipc.invoke("vector_clear_collection", {"collection": collection})


class RuntimeStorageAPI(StorageAPI):
    """Runtime implementation of Storage API"""
    
    def __init__(self, ipc: TauriIPC, plugin_id: str):
        self._ipc = ipc
        self._plugin_id = plugin_id
    
    async def get(self, key: str) -> Optional[Any]:
        result = await self._ipc.invoke("storage_get", {
            "pluginId": self._plugin_id,
            "key": key
        })
        return result
    
    async def set(self, key: str, value: Any) -> None:
        await self._ipc.invoke("storage_set", {
            "pluginId": self._plugin_id,
            "key": key,
            "value": value
        })
    
    async def delete(self, key: str) -> None:
        await self._ipc.invoke("storage_delete", {
            "pluginId": self._plugin_id,
            "key": key
        })
    
    async def keys(self) -> List[str]:
        result = await self._ipc.invoke("storage_keys", {"pluginId": self._plugin_id})
        return result or []
    
    async def clear(self) -> None:
        await self._ipc.invoke("storage_clear", {"pluginId": self._plugin_id})


class RuntimeEventsAPI(EventsAPI):
    """Runtime implementation of Events API"""
    
    def __init__(self, ipc: TauriIPC):
        self._ipc = ipc
        self._handlers: Dict[str, List[Callable]] = {}
    
    def on(self, event: str, handler: Callable[..., None]) -> Callable[[], None]:
        if event not in self._handlers:
            self._handlers[event] = []
        self._handlers[event].append(handler)
        
        # Also subscribe via IPC
        unsubscribe = self._ipc.listen(event, handler)
        
        def cleanup():
            try:
                self._handlers[event].remove(handler)
            except (KeyError, ValueError):
                pass
            unsubscribe()
        
        return cleanup
    
    def off(self, event: str, handler: Callable[..., None]) -> None:
        if event in self._handlers:
            try:
                self._handlers[event].remove(handler)
            except ValueError:
                pass
    
    def emit(self, event: str, *args: Any) -> None:
        # Emit locally
        if event in self._handlers:
            for handler in self._handlers[event]:
                try:
                    handler(*args)
                except Exception as e:
                    logger.error(f"Error in event handler: {e}")
        
        # Also emit via IPC (fire and forget)
        asyncio.create_task(self._ipc.emit(event, args))
    
    def once(self, event: str, handler: Callable[..., None]) -> Callable[[], None]:
        unsubscribe: Optional[Callable[[], None]] = None
        
        def wrapper(*args):
            if unsubscribe:
                unsubscribe()
            handler(*args)
        
        unsubscribe = self.on(event, wrapper)
        return unsubscribe


class RuntimeNetworkAPI(NetworkAPI):
    """Runtime implementation of Network API"""
    
    def __init__(self, ipc: TauriIPC):
        self._ipc = ipc
    
    async def get(self, url: str, options: Optional[NetworkRequestOptions] = None) -> NetworkResponse:
        return await self.fetch(url, NetworkRequestOptions(method="GET", **(options.__dict__ if options else {})))
    
    async def post(self, url: str, body: Any = None, options: Optional[NetworkRequestOptions] = None) -> NetworkResponse:
        opts = options or NetworkRequestOptions()
        opts.method = "POST"
        opts.body = body
        return await self.fetch(url, opts)
    
    async def put(self, url: str, body: Any = None, options: Optional[NetworkRequestOptions] = None) -> NetworkResponse:
        opts = options or NetworkRequestOptions()
        opts.method = "PUT"
        opts.body = body
        return await self.fetch(url, opts)
    
    async def delete(self, url: str, options: Optional[NetworkRequestOptions] = None) -> NetworkResponse:
        opts = options or NetworkRequestOptions()
        opts.method = "DELETE"
        return await self.fetch(url, opts)
    
    async def patch(self, url: str, body: Any = None, options: Optional[NetworkRequestOptions] = None) -> NetworkResponse:
        opts = options or NetworkRequestOptions()
        opts.method = "PATCH"
        opts.body = body
        return await self.fetch(url, opts)
    
    async def fetch(self, url: str, options: Optional[NetworkRequestOptions] = None) -> NetworkResponse:
        result = await self._ipc.invoke("network_fetch", {
            "url": url,
            "options": _to_dict(options) if options else None
        })
        return _from_dict(NetworkResponse, result)
    
    async def download(self, url: str, dest_path: str, on_progress: Optional[Callable[[DownloadProgress], None]] = None) -> DownloadResult:
        # Set up progress listener if provided
        if on_progress:
            unsubscribe = self._ipc.listen("download_progress", lambda p: on_progress(_from_dict(DownloadProgress, p)))
        
        try:
            result = await self._ipc.invoke("network_download", {
                "url": url,
                "destPath": dest_path
            })
            return _from_dict(DownloadResult, result)
        finally:
            if on_progress:
                unsubscribe()
    
    async def upload(self, url: str, file_path: str, field_name: str = "file", on_progress: Optional[Callable[[DownloadProgress], None]] = None) -> NetworkResponse:
        if on_progress:
            unsubscribe = self._ipc.listen("upload_progress", lambda p: on_progress(_from_dict(DownloadProgress, p)))
        
        try:
            result = await self._ipc.invoke("network_upload", {
                "url": url,
                "filePath": file_path,
                "fieldName": field_name
            })
            return _from_dict(NetworkResponse, result)
        finally:
            if on_progress:
                unsubscribe()


class RuntimeFileSystemAPI(FileSystemAPI):
    """Runtime implementation of File System API"""
    
    def __init__(self, ipc: TauriIPC, plugin_id: str):
        self._ipc = ipc
        self._plugin_id = plugin_id
    
    async def read_text(self, path: str) -> str:
        result = await self._ipc.invoke("fs_read_text", {"path": path})
        return result or ""
    
    async def read_binary(self, path: str) -> bytes:
        result = await self._ipc.invoke("fs_read_binary", {"path": path})
        return bytes(result) if result else b""
    
    async def read_json(self, path: str) -> Any:
        result = await self._ipc.invoke("fs_read_json", {"path": path})
        return result
    
    async def write_text(self, path: str, content: str) -> None:
        await self._ipc.invoke("fs_write_text", {"path": path, "content": content})
    
    async def write_binary(self, path: str, content: bytes) -> None:
        await self._ipc.invoke("fs_write_binary", {"path": path, "content": list(content)})
    
    async def write_json(self, path: str, data: Any, pretty: bool = True) -> None:
        await self._ipc.invoke("fs_write_json", {"path": path, "data": data, "pretty": pretty})
    
    async def append_text(self, path: str, content: str) -> None:
        await self._ipc.invoke("fs_append_text", {"path": path, "content": content})
    
    async def exists(self, path: str) -> bool:
        result = await self._ipc.invoke("fs_exists", {"path": path})
        return bool(result)
    
    async def mkdir(self, path: str, recursive: bool = True) -> None:
        await self._ipc.invoke("fs_mkdir", {"path": path, "recursive": recursive})
    
    async def remove(self, path: str, recursive: bool = False) -> None:
        await self._ipc.invoke("fs_remove", {"path": path, "recursive": recursive})
    
    async def copy(self, src: str, dest: str) -> None:
        await self._ipc.invoke("fs_copy", {"src": src, "dest": dest})
    
    async def move(self, src: str, dest: str) -> None:
        await self._ipc.invoke("fs_move", {"src": src, "dest": dest})
    
    async def read_dir(self, path: str) -> List[FileEntry]:
        result = await self._ipc.invoke("fs_read_dir", {"path": path})
        return [_from_dict(FileEntry, e) for e in (result or [])]
    
    async def stat(self, path: str) -> FileStat:
        result = await self._ipc.invoke("fs_stat", {"path": path})
        return _from_dict(FileStat, result)
    
    def watch(self, path: str, callback: Callable[[FileWatchEvent], None]) -> Callable[[], None]:
        return self._ipc.listen("fs_watch", lambda e: callback(_from_dict(FileWatchEvent, e)))
    
    def get_data_dir(self) -> str:
        # This is synchronous, would need to be cached
        return f"~/.cognia/plugins/{self._plugin_id}/data"
    
    def get_cache_dir(self) -> str:
        return f"~/.cognia/plugins/{self._plugin_id}/cache"
    
    def get_temp_dir(self) -> str:
        return "/tmp/cognia"


class RuntimeShellAPI(ShellAPI):
    """Runtime implementation of Shell API"""
    
    def __init__(self, ipc: TauriIPC):
        self._ipc = ipc
    
    async def execute(self, command: str, options: Optional[ShellOptions] = None) -> ShellResult:
        result = await self._ipc.invoke("shell_execute", {
            "command": command,
            "options": _to_dict(options) if options else None
        })
        return _from_dict(ShellResult, result)
    
    async def open(self, path: str) -> None:
        await self._ipc.invoke("shell_open", {"path": path})
    
    async def show_in_folder(self, path: str) -> None:
        await self._ipc.invoke("shell_show_in_folder", {"path": path})


class RuntimePluginContext(ExtendedPluginContext):
    """
    Runtime plugin context with all APIs initialized.
    
    This is the main context passed to plugins at runtime,
    providing access to all Cognia APIs via IPC.
    """
    
    def __init__(
        self,
        plugin_id: str,
        plugin_path: str,
        config: Optional[Dict[str, Any]] = None,
        ipc: Optional[TauriIPC] = None,
    ):
        self._ipc = ipc or get_ipc()
        
        # Initialize base
        super().__init__(
            plugin_id=plugin_id,
            plugin_path=plugin_path,
            config=config or {},
        )
        
        # Initialize APIs
        self.session = RuntimeSessionAPI(self._ipc)
        self.project = RuntimeProjectAPI(self._ipc)
        self.vector = RuntimeVectorAPI(self._ipc)
        self.storage = RuntimeStorageAPI(self._ipc, plugin_id)
        self.events = RuntimeEventsAPI(self._ipc)
        self.network = RuntimeNetworkAPI(self._ipc)
        self.fs = RuntimeFileSystemAPI(self._ipc, plugin_id)
        self.shell = RuntimeShellAPI(self._ipc)
        
        # Note: Other APIs (theme, export, canvas, etc.) would be similarly initialized
        # They are left as None here but would be implemented the same way
    
    async def initialize(self) -> None:
        """Initialize the context (connect IPC, etc.)"""
        await self._ipc.connect()
    
    async def shutdown(self) -> None:
        """Shutdown the context"""
        await self._ipc.disconnect()


def create_runtime_context(
    plugin_id: str,
    plugin_path: str,
    config: Optional[Dict[str, Any]] = None,
) -> RuntimePluginContext:
    """
    Create a runtime plugin context.
    
    Args:
        plugin_id: Plugin identifier
        plugin_path: Path to plugin directory
        config: Plugin configuration
        
    Returns:
        Initialized RuntimePluginContext
    """
    return RuntimePluginContext(plugin_id, plugin_path, config)


__all__ = [
    # API Implementations
    "RuntimeSessionAPI",
    "RuntimeProjectAPI",
    "RuntimeVectorAPI",
    "RuntimeStorageAPI",
    "RuntimeEventsAPI",
    "RuntimeNetworkAPI",
    "RuntimeFileSystemAPI",
    "RuntimeShellAPI",
    # Context
    "RuntimePluginContext",
    "create_runtime_context",
]
