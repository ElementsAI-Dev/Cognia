"""
Extended Plugin Context APIs for Cognia Plugin SDK

Provides comprehensive APIs matching the TypeScript PluginContext and ExtendedPluginContext.
"""

from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, Generic, List, Optional, TypeVar, AsyncIterator
from dataclasses import dataclass, field

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

T = TypeVar('T')


# =============================================================================
# Session API
# =============================================================================

class SessionAPI(ABC):
    """Session management API for plugins"""
    
    @abstractmethod
    def get_current_session(self) -> Optional[Session]:
        """Get the currently active session"""
        pass
    
    @abstractmethod
    def get_current_session_id(self) -> Optional[str]:
        """Get the current session ID"""
        pass
    
    @abstractmethod
    async def get_session(self, session_id: str) -> Optional[Session]:
        """Get a session by ID"""
        pass
    
    @abstractmethod
    async def create_session(self, title: str = "", mode: str = "normal", **kwargs) -> Session:
        """Create a new session"""
        pass
    
    @abstractmethod
    async def update_session(self, session_id: str, **updates) -> None:
        """Update a session"""
        pass
    
    @abstractmethod
    async def switch_session(self, session_id: str) -> None:
        """Switch to a different session"""
        pass
    
    @abstractmethod
    async def delete_session(self, session_id: str) -> None:
        """Delete a session"""
        pass
    
    @abstractmethod
    async def list_sessions(self, filter: Optional[SessionFilter] = None) -> List[Session]:
        """List sessions with optional filtering"""
        pass
    
    @abstractmethod
    async def get_messages(self, session_id: str, options: Optional[MessageQueryOptions] = None) -> List[UIMessage]:
        """Get messages for a session"""
        pass
    
    @abstractmethod
    async def add_message(self, session_id: str, content: str, options: Optional[SendMessageOptions] = None) -> UIMessage:
        """Add a message to a session"""
        pass
    
    @abstractmethod
    async def update_message(self, session_id: str, message_id: str, **updates) -> None:
        """Update a message"""
        pass
    
    @abstractmethod
    async def delete_message(self, session_id: str, message_id: str) -> None:
        """Delete a message"""
        pass
    
    @abstractmethod
    def on_session_change(self, handler: Callable[[Optional[Session]], None]) -> Callable[[], None]:
        """Subscribe to session changes"""
        pass
    
    @abstractmethod
    def on_messages_change(self, session_id: str, handler: Callable[[List[UIMessage]], None]) -> Callable[[], None]:
        """Subscribe to message changes in a session"""
        pass
    
    @abstractmethod
    async def get_session_stats(self, session_id: str) -> SessionStats:
        """Get session statistics"""
        pass


# =============================================================================
# Project API
# =============================================================================

class ProjectAPI(ABC):
    """Project management API for plugins"""
    
    @abstractmethod
    def get_current_project(self) -> Optional[Project]:
        """Get the currently active project"""
        pass
    
    @abstractmethod
    def get_current_project_id(self) -> Optional[str]:
        """Get the current project ID"""
        pass
    
    @abstractmethod
    async def get_project(self, project_id: str) -> Optional[Project]:
        """Get a project by ID"""
        pass
    
    @abstractmethod
    async def create_project(self, name: str, description: str = "", **kwargs) -> Project:
        """Create a new project"""
        pass
    
    @abstractmethod
    async def update_project(self, project_id: str, **updates) -> None:
        """Update a project"""
        pass
    
    @abstractmethod
    async def delete_project(self, project_id: str) -> None:
        """Delete a project"""
        pass
    
    @abstractmethod
    async def set_active_project(self, project_id: Optional[str]) -> None:
        """Set the active project"""
        pass
    
    @abstractmethod
    async def list_projects(self, filter: Optional[ProjectFilter] = None) -> List[Project]:
        """List projects with optional filtering"""
        pass
    
    @abstractmethod
    async def archive_project(self, project_id: str) -> None:
        """Archive a project"""
        pass
    
    @abstractmethod
    async def unarchive_project(self, project_id: str) -> None:
        """Unarchive a project"""
        pass
    
    @abstractmethod
    async def add_knowledge_file(self, project_id: str, file: ProjectFileInput) -> KnowledgeFile:
        """Add a file to project knowledge base"""
        pass
    
    @abstractmethod
    async def remove_knowledge_file(self, project_id: str, file_id: str) -> None:
        """Remove a file from project knowledge base"""
        pass
    
    @abstractmethod
    async def update_knowledge_file(self, project_id: str, file_id: str, content: str) -> None:
        """Update a knowledge file"""
        pass
    
    @abstractmethod
    async def get_knowledge_files(self, project_id: str) -> List[KnowledgeFile]:
        """Get all knowledge files for a project"""
        pass
    
    @abstractmethod
    async def link_session(self, project_id: str, session_id: str) -> None:
        """Link a session to a project"""
        pass
    
    @abstractmethod
    async def unlink_session(self, project_id: str, session_id: str) -> None:
        """Unlink a session from a project"""
        pass
    
    @abstractmethod
    async def get_project_sessions(self, project_id: str) -> List[str]:
        """Get all sessions for a project"""
        pass
    
    @abstractmethod
    def on_project_change(self, handler: Callable[[Optional[Project]], None]) -> Callable[[], None]:
        """Subscribe to project changes"""
        pass
    
    @abstractmethod
    async def add_tag(self, project_id: str, tag: str) -> None:
        """Add a tag to a project"""
        pass
    
    @abstractmethod
    async def remove_tag(self, project_id: str, tag: str) -> None:
        """Remove a tag from a project"""
        pass


# =============================================================================
# Vector/RAG API
# =============================================================================

class VectorAPI(ABC):
    """Vector/RAG API for semantic search and retrieval"""
    
    @abstractmethod
    async def create_collection(self, name: str, options: Optional[CollectionOptions] = None) -> str:
        """Create a new collection"""
        pass
    
    @abstractmethod
    async def delete_collection(self, name: str) -> None:
        """Delete a collection"""
        pass
    
    @abstractmethod
    async def list_collections(self) -> List[str]:
        """List all collections"""
        pass
    
    @abstractmethod
    async def get_collection_info(self, name: str) -> CollectionStats:
        """Get collection info"""
        pass
    
    @abstractmethod
    async def add_documents(self, collection: str, docs: List[VectorDocument]) -> List[str]:
        """Add documents to a collection"""
        pass
    
    @abstractmethod
    async def update_documents(self, collection: str, docs: List[VectorDocument]) -> None:
        """Update documents in a collection"""
        pass
    
    @abstractmethod
    async def delete_documents(self, collection: str, ids: List[str]) -> None:
        """Delete documents from a collection"""
        pass
    
    @abstractmethod
    async def search(self, collection: str, query: str, options: Optional[VectorSearchOptions] = None) -> List[VectorSearchResult]:
        """Search documents in a collection"""
        pass
    
    @abstractmethod
    async def search_by_embedding(self, collection: str, embedding: List[float], options: Optional[VectorSearchOptions] = None) -> List[VectorSearchResult]:
        """Search with a pre-computed embedding"""
        pass
    
    @abstractmethod
    async def embed(self, text: str) -> List[float]:
        """Generate embedding for text"""
        pass
    
    @abstractmethod
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        pass
    
    @abstractmethod
    async def get_document_count(self, collection: str) -> int:
        """Get document count in a collection"""
        pass
    
    @abstractmethod
    async def clear_collection(self, collection: str) -> None:
        """Clear all documents in a collection"""
        pass


# =============================================================================
# Theme API
# =============================================================================

class ThemeAPI(ABC):
    """Theme customization API for plugins"""
    
    @abstractmethod
    def get_theme(self) -> ThemeState:
        """Get current theme state"""
        pass
    
    @abstractmethod
    def get_mode(self) -> ThemeMode:
        """Get current theme mode"""
        pass
    
    @abstractmethod
    def get_resolved_mode(self) -> str:
        """Get resolved theme mode (light or dark)"""
        pass
    
    @abstractmethod
    def set_mode(self, mode: ThemeMode) -> None:
        """Set theme mode"""
        pass
    
    @abstractmethod
    def get_color_preset(self) -> ColorThemePreset:
        """Get current color preset"""
        pass
    
    @abstractmethod
    def set_color_preset(self, preset: ColorThemePreset) -> None:
        """Set color preset"""
        pass
    
    @abstractmethod
    def get_available_presets(self) -> List[ColorThemePreset]:
        """Get all color presets"""
        pass
    
    @abstractmethod
    def get_colors(self) -> ThemeColors:
        """Get current theme colors"""
        pass
    
    @abstractmethod
    def register_custom_theme(self, name: str, colors: ThemeColors, is_dark: bool = False) -> str:
        """Register a custom theme"""
        pass
    
    @abstractmethod
    def update_custom_theme(self, theme_id: str, **updates) -> None:
        """Update a custom theme"""
        pass
    
    @abstractmethod
    def delete_custom_theme(self, theme_id: str) -> None:
        """Delete a custom theme"""
        pass
    
    @abstractmethod
    def get_custom_themes(self) -> List[CustomTheme]:
        """Get all custom themes"""
        pass
    
    @abstractmethod
    def activate_custom_theme(self, theme_id: str) -> None:
        """Activate a custom theme"""
        pass
    
    @abstractmethod
    def on_theme_change(self, handler: Callable[[ThemeState], None]) -> Callable[[], None]:
        """Subscribe to theme changes"""
        pass
    
    @abstractmethod
    def apply_scoped_colors(self, element: Any, colors: Dict[str, str]) -> Callable[[], None]:
        """
        Apply scoped colors to an element.
        
        Args:
            element: Target element
            colors: Color overrides
            
        Returns:
            Cleanup function
        """
        pass


# =============================================================================
# Export API
# =============================================================================

class ExportAPI(ABC):
    """Export API for plugins"""
    
    @abstractmethod
    async def export_session(self, session_id: str, options: ExportOptions) -> ExportResult:
        """Export a session"""
        pass
    
    @abstractmethod
    async def export_project(self, project_id: str, options: ExportOptions) -> ExportResult:
        """Export a project"""
        pass
    
    @abstractmethod
    async def export_messages(self, messages: List[UIMessage], options: ExportOptions) -> ExportResult:
        """Export messages"""
        pass
    
    @abstractmethod
    def download(self, result: ExportResult, filename: Optional[str] = None) -> None:
        """Download an export result"""
        pass
    
    @abstractmethod
    def get_available_formats(self) -> List[ExportFormat]:
        """Get available export formats"""
        pass
    
    @abstractmethod
    def generate_filename(self, title: str, extension: str) -> str:
        """Generate filename for export"""
        pass
    
    @abstractmethod
    def register_exporter(self, exporter: Any) -> Callable[[], None]:
        """
        Register a custom exporter.
        
        Args:
            exporter: CustomExporter definition
            
        Returns:
            Unregister function
        """
        pass
    
    @abstractmethod
    def get_custom_exporters(self) -> List[Any]:
        """Get all registered custom exporters"""
        pass


# =============================================================================
# Canvas API
# =============================================================================

class CanvasAPI(ABC):
    """Canvas editing API for plugins"""
    
    @abstractmethod
    def get_current_document(self) -> Optional[CanvasDocument]:
        """Get current canvas document"""
        pass
    
    @abstractmethod
    def get_document(self, doc_id: str) -> Optional[CanvasDocument]:
        """Get a canvas document by ID"""
        pass
    
    @abstractmethod
    async def create_document(self, options: CreateCanvasDocumentOptions) -> str:
        """Create a new canvas document"""
        pass
    
    @abstractmethod
    def update_document(self, doc_id: str, **updates) -> None:
        """Update a canvas document"""
        pass
    
    @abstractmethod
    def delete_document(self, doc_id: str) -> None:
        """Delete a canvas document"""
        pass
    
    @abstractmethod
    def open_document(self, doc_id: str) -> None:
        """Open a canvas document"""
        pass
    
    @abstractmethod
    def close_canvas(self) -> None:
        """Close the canvas panel"""
        pass
    
    @abstractmethod
    def get_selection(self) -> Optional[CanvasSelection]:
        """Get current selection in canvas"""
        pass
    
    @abstractmethod
    def set_selection(self, start: int, end: int) -> None:
        """Set selection in canvas"""
        pass
    
    @abstractmethod
    def insert_text(self, text: str) -> None:
        """Insert text at cursor position"""
        pass
    
    @abstractmethod
    def replace_selection(self, text: str) -> None:
        """Replace selected text"""
        pass
    
    @abstractmethod
    def get_content(self, doc_id: Optional[str] = None) -> str:
        """Get document content"""
        pass
    
    @abstractmethod
    def set_content(self, content: str, doc_id: Optional[str] = None) -> None:
        """Set document content"""
        pass
    
    @abstractmethod
    async def save_version(self, doc_id: str, description: Optional[str] = None) -> str:
        """Save a version of the document"""
        pass
    
    @abstractmethod
    def restore_version(self, document_id: str, version_id: str) -> None:
        """Restore a version"""
        pass
    
    @abstractmethod
    def get_versions(self, doc_id: str) -> List[CanvasDocumentVersion]:
        """Get all versions of a document"""
        pass
    
    @abstractmethod
    def on_canvas_change(self, handler: Callable[[Optional[CanvasDocument]], None]) -> Callable[[], None]:
        """Subscribe to canvas changes"""
        pass
    
    @abstractmethod
    def on_content_change(self, handler: Callable[[str], None]) -> Callable[[], None]:
        """Subscribe to content changes"""
        pass


# =============================================================================
# Artifact API
# =============================================================================

class ArtifactAPI(ABC):
    """Artifact management API for plugins"""
    
    @abstractmethod
    def get_active_artifact(self) -> Optional[Artifact]:
        """Get active artifact"""
        pass
    
    @abstractmethod
    def get_artifact(self, artifact_id: str) -> Optional[Artifact]:
        """Get an artifact by ID"""
        pass
    
    @abstractmethod
    async def create_artifact(self, options: CreateArtifactOptions) -> str:
        """Create a new artifact"""
        pass
    
    @abstractmethod
    def update_artifact(self, artifact_id: str, **updates) -> None:
        """Update an artifact"""
        pass
    
    @abstractmethod
    def delete_artifact(self, artifact_id: str) -> None:
        """Delete an artifact"""
        pass
    
    @abstractmethod
    def list_artifacts(self, filter: Optional[ArtifactFilter] = None) -> List[Artifact]:
        """List artifacts"""
        pass
    
    @abstractmethod
    def open_artifact(self, artifact_id: str) -> None:
        """Open artifact panel with specific artifact"""
        pass
    
    @abstractmethod
    def close_artifact(self) -> None:
        """Close artifact panel"""
        pass
    
    @abstractmethod
    def on_artifact_change(self, handler: Callable[[Optional[Artifact]], None]) -> Callable[[], None]:
        """Subscribe to artifact changes"""
        pass
    
    @abstractmethod
    def register_renderer(self, renderer: Any) -> Callable[[], None]:
        """
        Register a custom artifact renderer.
        
        Args:
            renderer: ArtifactRenderer definition
            
        Returns:
            Unregister function
        """
        pass


# =============================================================================
# Notification Center API
# =============================================================================

class NotificationCenterAPI(ABC):
    """Notification Center API for plugins"""
    
    @abstractmethod
    def create(self, options: NotificationOptions) -> str:
        """Create a notification"""
        pass
    
    @abstractmethod
    def update(self, notification_id: str, **updates) -> None:
        """Update a notification"""
        pass
    
    @abstractmethod
    def dismiss(self, notification_id: str) -> None:
        """Dismiss a notification"""
        pass
    
    @abstractmethod
    def dismiss_all(self) -> None:
        """Dismiss all notifications"""
        pass
    
    @abstractmethod
    def get_all(self) -> List[Notification]:
        """Get all active notifications"""
        pass
    
    @abstractmethod
    def on_action(self, handler: Callable[[str, str], None]) -> Callable[[], None]:
        """Subscribe to notification actions"""
        pass
    
    def create_progress(self, title: str, message: str) -> "ProgressNotification":
        """Create a progress notification"""
        notification_id = self.create(NotificationOptions(
            title=title,
            message=message,
            type="info",
            persistent=True,
            progress=0.0,
        ))
        return ProgressNotification(notification_id, self)


@dataclass
class ProgressNotification:
    """Progress notification helper"""
    id: str
    api: NotificationCenterAPI
    
    def update(self, progress: float, message: Optional[str] = None) -> None:
        """Update progress"""
        updates: Dict[str, Any] = {"progress": progress}
        if message:
            updates["message"] = message
        self.api.update(self.id, **updates)
    
    def complete(self, message: Optional[str] = None) -> None:
        """Complete the progress"""
        self.update(1.0, message or "Complete")
        self.api.dismiss(self.id)
    
    def error(self, message: str) -> None:
        """Mark as error"""
        self.api.update(self.id, type="error", message=message)


# =============================================================================
# AI Provider API
# =============================================================================

class AIProviderAPI(ABC):
    """AI Provider API for plugins"""
    
    @abstractmethod
    def get_available_models(self) -> List[AIModel]:
        """Get available models"""
        pass
    
    @abstractmethod
    def get_provider_models(self, provider_id: str) -> List[AIModel]:
        """Get models for a specific provider"""
        pass
    
    @abstractmethod
    async def chat(self, messages: List[AIChatMessage], options: Optional[AIChatOptions] = None) -> AsyncIterator[AIChatChunk]:
        """Chat with a model"""
        pass
    
    @abstractmethod
    async def embed(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings"""
        pass
    
    @abstractmethod
    def get_default_model(self) -> str:
        """Get current default model"""
        pass
    
    @abstractmethod
    def get_default_provider(self) -> str:
        """Get current default provider"""
        pass


# =============================================================================
# Permission API
# =============================================================================

class PermissionAPI(ABC):
    """Permission management API for plugins"""
    
    @abstractmethod
    def has_permission(self, permission: ExtendedPermission) -> bool:
        """Check if plugin has a permission"""
        pass
    
    @abstractmethod
    async def request_permission(self, permission: ExtendedPermission, reason: Optional[str] = None) -> bool:
        """Request a permission from user"""
        pass
    
    @abstractmethod
    def get_granted_permissions(self) -> List[ExtendedPermission]:
        """Get all granted permissions"""
        pass
    
    @abstractmethod
    def has_all_permissions(self, permissions: List[ExtendedPermission]) -> bool:
        """Check multiple permissions"""
        pass
    
    @abstractmethod
    def has_any_permission(self, permissions: List[ExtendedPermission]) -> bool:
        """Check if any permission is granted"""
        pass


# =============================================================================
# Network API
# =============================================================================

class NetworkAPI(ABC):
    """Network API for HTTP requests"""
    
    @abstractmethod
    async def get(self, url: str, options: Optional[NetworkRequestOptions] = None) -> NetworkResponse:
        """Make a GET request"""
        pass
    
    @abstractmethod
    async def post(self, url: str, body: Any = None, options: Optional[NetworkRequestOptions] = None) -> NetworkResponse:
        """Make a POST request"""
        pass
    
    @abstractmethod
    async def put(self, url: str, body: Any = None, options: Optional[NetworkRequestOptions] = None) -> NetworkResponse:
        """Make a PUT request"""
        pass
    
    @abstractmethod
    async def delete(self, url: str, options: Optional[NetworkRequestOptions] = None) -> NetworkResponse:
        """Make a DELETE request"""
        pass
    
    @abstractmethod
    async def patch(self, url: str, body: Any = None, options: Optional[NetworkRequestOptions] = None) -> NetworkResponse:
        """Make a PATCH request"""
        pass
    
    @abstractmethod
    async def fetch(self, url: str, options: Optional[NetworkRequestOptions] = None) -> NetworkResponse:
        """Generic fetch with full control"""
        pass
    
    @abstractmethod
    async def download(self, url: str, dest_path: str, on_progress: Optional[Callable[[DownloadProgress], None]] = None) -> DownloadResult:
        """Download a file"""
        pass
    
    @abstractmethod
    async def upload(self, url: str, file_path: str, field_name: str = "file", on_progress: Optional[Callable[[DownloadProgress], None]] = None) -> NetworkResponse:
        """Upload a file"""
        pass


# =============================================================================
# File System API
# =============================================================================

class FileSystemAPI(ABC):
    """File System API for file operations"""
    
    @abstractmethod
    async def read_text(self, path: str) -> str:
        """Read file as text"""
        pass
    
    @abstractmethod
    async def read_binary(self, path: str) -> bytes:
        """Read file as binary"""
        pass
    
    @abstractmethod
    async def read_json(self, path: str) -> Any:
        """Read file as JSON"""
        pass
    
    @abstractmethod
    async def write_text(self, path: str, content: str) -> None:
        """Write text to file"""
        pass
    
    @abstractmethod
    async def write_binary(self, path: str, content: bytes) -> None:
        """Write binary to file"""
        pass
    
    @abstractmethod
    async def write_json(self, path: str, data: Any, pretty: bool = True) -> None:
        """Write JSON to file"""
        pass
    
    @abstractmethod
    async def append_text(self, path: str, content: str) -> None:
        """Append text to file"""
        pass
    
    @abstractmethod
    async def exists(self, path: str) -> bool:
        """Check if path exists"""
        pass
    
    @abstractmethod
    async def mkdir(self, path: str, recursive: bool = True) -> None:
        """Create directory"""
        pass
    
    @abstractmethod
    async def remove(self, path: str, recursive: bool = False) -> None:
        """Remove file or directory"""
        pass
    
    @abstractmethod
    async def copy(self, src: str, dest: str) -> None:
        """Copy file or directory"""
        pass
    
    @abstractmethod
    async def move(self, src: str, dest: str) -> None:
        """Move/rename file or directory"""
        pass
    
    @abstractmethod
    async def read_dir(self, path: str) -> List[FileEntry]:
        """List directory contents"""
        pass
    
    @abstractmethod
    async def stat(self, path: str) -> FileStat:
        """Get file/directory info"""
        pass
    
    @abstractmethod
    def watch(self, path: str, callback: Callable[[FileWatchEvent], None]) -> Callable[[], None]:
        """Watch for file changes"""
        pass
    
    @abstractmethod
    def get_data_dir(self) -> str:
        """Get plugin data directory"""
        pass
    
    @abstractmethod
    def get_cache_dir(self) -> str:
        """Get plugin cache directory"""
        pass
    
    @abstractmethod
    def get_temp_dir(self) -> str:
        """Get temp directory"""
        pass


# =============================================================================
# Shell API
# =============================================================================

class ShellAPI(ABC):
    """Shell API for command execution"""
    
    @abstractmethod
    async def execute(self, command: str, options: Optional[ShellOptions] = None) -> ShellResult:
        """Execute a shell command"""
        pass
    
    @abstractmethod
    async def open(self, path: str) -> None:
        """Open a file or URL with default application"""
        pass
    
    @abstractmethod
    async def show_in_folder(self, path: str) -> None:
        """Open a path in file explorer"""
        pass
    
    @abstractmethod
    def spawn(self, command: str, args: Optional[List[str]] = None, options: Optional[Any] = None) -> Any:
        """
        Spawn a long-running process.
        
        Args:
            command: Command to execute
            args: Command arguments
            options: SpawnOptions
            
        Returns:
            ChildProcess handle
        """
        pass


# =============================================================================
# Database API
# =============================================================================

class DatabaseAPI(ABC):
    """Database API for local database operations"""
    
    @abstractmethod
    async def query(self, sql: str, params: Optional[List[Any]] = None) -> List[Dict[str, Any]]:
        """Execute a query"""
        pass
    
    @abstractmethod
    async def execute(self, sql: str, params: Optional[List[Any]] = None) -> DatabaseResult:
        """Execute a statement (insert, update, delete)"""
        pass
    
    @abstractmethod
    async def create_table(self, name: str, schema: TableSchema) -> None:
        """Create a table"""
        pass
    
    @abstractmethod
    async def drop_table(self, name: str) -> None:
        """Drop a table"""
        pass
    
    @abstractmethod
    async def table_exists(self, name: str) -> bool:
        """Check if table exists"""
        pass


# =============================================================================
# Shortcuts API
# =============================================================================

class ShortcutsAPI(ABC):
    """Keyboard Shortcuts API"""
    
    @abstractmethod
    def register(self, shortcut: str, callback: Callable[[], None], options: Optional[ShortcutOptions] = None) -> Callable[[], None]:
        """Register a global keyboard shortcut"""
        pass
    
    @abstractmethod
    def register_many(self, shortcuts: List[ShortcutRegistration]) -> Callable[[], None]:
        """Register multiple shortcuts"""
        pass
    
    @abstractmethod
    def is_available(self, shortcut: str) -> bool:
        """Check if a shortcut is available"""
        pass
    
    @abstractmethod
    def get_registered(self) -> List[str]:
        """Get all registered shortcuts for this plugin"""
        pass


# =============================================================================
# Context Menu API
# =============================================================================

class ContextMenuAPI(ABC):
    """Context Menu API"""
    
    @abstractmethod
    def register(self, item: ContextMenuItem) -> Callable[[], None]:
        """Register a context menu item"""
        pass
    
    @abstractmethod
    def register_many(self, items: List[ContextMenuItem]) -> Callable[[], None]:
        """Register multiple context menu items"""
        pass


# =============================================================================
# Storage API
# =============================================================================

class StorageAPI(ABC):
    """Plugin storage API"""
    
    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        """Get value by key"""
        pass
    
    @abstractmethod
    async def set(self, key: str, value: Any) -> None:
        """Set value by key"""
        pass
    
    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete value by key"""
        pass
    
    @abstractmethod
    async def keys(self) -> List[str]:
        """Get all keys"""
        pass
    
    @abstractmethod
    async def clear(self) -> None:
        """Clear all storage"""
        pass


# =============================================================================
# Events API
# =============================================================================

class EventsAPI(ABC):
    """Plugin event emitter API"""
    
    @abstractmethod
    def on(self, event: str, handler: Callable[..., None]) -> Callable[[], None]:
        """Subscribe to an event"""
        pass
    
    @abstractmethod
    def off(self, event: str, handler: Callable[..., None]) -> None:
        """Unsubscribe from an event"""
        pass
    
    @abstractmethod
    def emit(self, event: str, *args: Any) -> None:
        """Emit an event"""
        pass
    
    @abstractmethod
    def once(self, event: str, handler: Callable[..., None]) -> Callable[[], None]:
        """Subscribe to an event once"""
        pass


# =============================================================================
# UI API
# =============================================================================

@dataclass
class DialogOptions:
    """Dialog options"""
    title: str
    content: str
    actions: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class InputDialogOptions:
    """Input dialog options"""
    title: str
    message: str = ""
    placeholder: str = ""
    default_value: str = ""


@dataclass
class ConfirmDialogOptions:
    """Confirm dialog options"""
    title: str
    message: str
    confirm_label: str = "Confirm"
    cancel_label: str = "Cancel"
    variant: str = "default"  # 'default', 'destructive'


@dataclass
class StatusBarItem:
    """Status bar item"""
    id: str
    text: str
    icon: Optional[str] = None
    tooltip: Optional[str] = None
    on_click: Optional[Callable[[], None]] = None
    priority: int = 0


class UIAPI(ABC):
    """UI API for plugins"""
    
    @abstractmethod
    def show_notification(self, title: str, body: str, icon: Optional[str] = None, timeout: Optional[int] = None) -> None:
        """Show a system notification"""
        pass
    
    @abstractmethod
    def show_toast(self, message: str, type: str = "info") -> None:
        """Show a toast message"""
        pass
    
    @abstractmethod
    async def show_dialog(self, options: DialogOptions) -> Any:
        """Show a dialog"""
        pass
    
    @abstractmethod
    async def show_input_dialog(self, options: InputDialogOptions) -> Optional[str]:
        """Show an input dialog"""
        pass
    
    @abstractmethod
    async def show_confirm_dialog(self, options: ConfirmDialogOptions) -> bool:
        """Show a confirm dialog"""
        pass
    
    @abstractmethod
    def register_status_bar_item(self, item: StatusBarItem) -> Callable[[], None]:
        """Register a status bar item"""
        pass


# =============================================================================
# Secrets API
# =============================================================================

class SecretsAPI(ABC):
    """Secrets API for secure storage"""
    
    @abstractmethod
    async def get(self, key: str) -> Optional[str]:
        """Get a secret by key"""
        pass
    
    @abstractmethod
    async def set(self, key: str, value: str) -> None:
        """Set a secret by key"""
        pass
    
    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete a secret by key"""
        pass
    
    @abstractmethod
    async def has(self, key: str) -> bool:
        """Check if a secret exists"""
        pass


# =============================================================================
# I18n API
# =============================================================================

class I18nAPI(ABC):
    """Internationalization API"""
    
    @abstractmethod
    def get_current_locale(self) -> str:
        """Get current locale"""
        pass
    
    @abstractmethod
    def get_available_locales(self) -> List[str]:
        """Get available locales"""
        pass
    
    @abstractmethod
    def get_locale_name(self, locale: str) -> str:
        """Get locale display name"""
        pass
    
    @abstractmethod
    def t(self, key: str, params: Optional[Dict[str, Any]] = None) -> str:
        """Translate a key"""
        pass
    
    @abstractmethod
    def register_translations(self, locale: str, translations: Dict[str, str]) -> None:
        """Register plugin translations"""
        pass
    
    @abstractmethod
    def has_translation(self, key: str) -> bool:
        """Check if a translation key exists"""
        pass
    
    @abstractmethod
    def on_locale_change(self, handler: Callable[[str], None]) -> Callable[[], None]:
        """Subscribe to locale changes"""
        pass
    
    @abstractmethod
    def format_date(self, date: Any, options: Optional[Dict[str, Any]] = None) -> str:
        """Format date according to locale"""
        pass
    
    @abstractmethod
    def format_number(self, number: float, options: Optional[Dict[str, Any]] = None) -> str:
        """Format number according to locale"""
        pass
    
    @abstractmethod
    def format_relative_time(self, date: Any) -> str:
        """Format relative time"""
        pass


# =============================================================================
# Extended Plugin Context
# =============================================================================

@dataclass
class ExtendedPluginContext:
    """Extended plugin context with all APIs"""
    
    # Core info
    plugin_id: str
    plugin_path: str
    config: Dict[str, Any] = field(default_factory=dict)
    
    # APIs (set by runtime)
    session: Optional[SessionAPI] = None
    project: Optional[ProjectAPI] = None
    vector: Optional[VectorAPI] = None
    theme: Optional[ThemeAPI] = None
    export: Optional[ExportAPI] = None
    canvas: Optional[CanvasAPI] = None
    artifact: Optional[ArtifactAPI] = None
    notifications: Optional[NotificationCenterAPI] = None
    ai: Optional[AIProviderAPI] = None
    permissions: Optional[PermissionAPI] = None
    network: Optional[NetworkAPI] = None
    fs: Optional[FileSystemAPI] = None
    shell: Optional[ShellAPI] = None
    db: Optional[DatabaseAPI] = None
    shortcuts: Optional[ShortcutsAPI] = None
    context_menu: Optional[ContextMenuAPI] = None
    storage: Optional[StorageAPI] = None
    events: Optional[EventsAPI] = None
    ui: Optional[UIAPI] = None
    secrets: Optional[SecretsAPI] = None
    i18n: Optional[I18nAPI] = None
    
    # Logger
    def log_debug(self, message: str) -> None:
        """Log debug message"""
        print(f"[DEBUG][{self.plugin_id}] {message}")
    
    def log_info(self, message: str) -> None:
        """Log info message"""
        print(f"[INFO][{self.plugin_id}] {message}")
    
    def log_warn(self, message: str) -> None:
        """Log warning message"""
        print(f"[WARN][{self.plugin_id}] {message}")
    
    def log_error(self, message: str) -> None:
        """Log error message"""
        print(f"[ERROR][{self.plugin_id}] {message}")
