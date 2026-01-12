"""
Type definitions for Cognia Plugin SDK
"""

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Union
from enum import Enum
from datetime import datetime


class PluginType(Enum):
    """Plugin type enumeration"""
    FRONTEND = "frontend"
    PYTHON = "python"
    HYBRID = "hybrid"


class PluginCapability(Enum):
    """Plugin capability enumeration"""
    TOOLS = "tools"
    COMPONENTS = "components"
    MODES = "modes"
    SKILLS = "skills"
    THEMES = "themes"
    COMMANDS = "commands"
    HOOKS = "hooks"
    PROCESSORS = "processors"
    PROVIDERS = "providers"
    EXPORTERS = "exporters"
    IMPORTERS = "importers"


class PluginPermission(Enum):
    """Plugin permission enumeration"""
    FILESYSTEM_READ = "filesystem:read"
    FILESYSTEM_WRITE = "filesystem:write"
    NETWORK_FETCH = "network:fetch"
    NETWORK_WEBSOCKET = "network:websocket"
    CLIPBOARD_READ = "clipboard:read"
    CLIPBOARD_WRITE = "clipboard:write"
    NOTIFICATION = "notification"
    SHELL_EXECUTE = "shell:execute"
    PROCESS_SPAWN = "process:spawn"
    DATABASE_READ = "database:read"
    DATABASE_WRITE = "database:write"
    SETTINGS_READ = "settings:read"
    SETTINGS_WRITE = "settings:write"
    SESSION_READ = "session:read"
    SESSION_WRITE = "session:write"
    AGENT_CONTROL = "agent:control"
    PYTHON_EXECUTE = "python:execute"


@dataclass
class ToolParameter:
    """Tool parameter definition"""
    name: str
    type: str  # 'string', 'number', 'boolean', 'array', 'object'
    description: str = ""
    required: bool = True
    default: Any = None
    enum: Optional[List[Any]] = None


@dataclass
class ToolMetadata:
    """Metadata for a tool decorated function"""
    name: str
    description: str
    parameters: Dict[str, ToolParameter] = field(default_factory=dict)
    requires_approval: bool = False
    category: Optional[str] = None


@dataclass
class HookMetadata:
    """Metadata for a hook decorated function"""
    hook_name: str
    priority: int = 0
    is_async: bool = False


@dataclass
class CommandMetadata:
    """Metadata for a command decorated function"""
    name: str
    description: str = ""
    shortcut: Optional[str] = None


@dataclass
class PluginAuthor:
    """Plugin author information"""
    name: str
    email: Optional[str] = None
    url: Optional[str] = None


@dataclass
class PluginManifest:
    """Plugin manifest definition"""
    id: str
    name: str
    version: str
    description: str
    plugin_type: PluginType = PluginType.PYTHON
    capabilities: List[PluginCapability] = field(default_factory=list)
    author: Optional[PluginAuthor] = None
    homepage: Optional[str] = None
    repository: Optional[str] = None
    license: Optional[str] = None
    keywords: List[str] = field(default_factory=list)
    icon: Optional[str] = None
    python_main: str = "main.py"
    python_dependencies: List[str] = field(default_factory=list)
    permissions: List[PluginPermission] = field(default_factory=list)
    config_schema: Optional[Dict[str, Any]] = None
    default_config: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert manifest to dictionary for JSON serialization"""
        result = {
            "id": self.id,
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "type": self.plugin_type.value,
            "capabilities": [c.value for c in self.capabilities],
            "pythonMain": self.python_main,
        }
        
        if self.author:
            result["author"] = {
                "name": self.author.name,
                "email": self.author.email,
                "url": self.author.url,
            }
        
        if self.homepage:
            result["homepage"] = self.homepage
        if self.repository:
            result["repository"] = self.repository
        if self.license:
            result["license"] = self.license
        if self.keywords:
            result["keywords"] = self.keywords
        if self.icon:
            result["icon"] = self.icon
        if self.python_dependencies:
            result["pythonDependencies"] = self.python_dependencies
        if self.permissions:
            result["permissions"] = [p.value for p in self.permissions]
        if self.config_schema:
            result["configSchema"] = self.config_schema
        if self.default_config:
            result["defaultConfig"] = self.default_config
            
        return result


@dataclass
class ToolContext:
    """Context passed to tool execution"""
    session_id: Optional[str] = None
    message_id: Optional[str] = None
    config: Dict[str, Any] = field(default_factory=dict)
    
    def report_progress(self, progress: float, message: Optional[str] = None):
        """Report progress of tool execution (0.0 to 1.0)"""
        # This will be implemented by the runtime
        pass


@dataclass
class PluginContext:
    """Context provided to plugins"""
    plugin_id: str
    plugin_path: str
    config: Dict[str, Any] = field(default_factory=dict)
    
    def log_debug(self, message: str):
        """Log debug message"""
        print(f"[DEBUG][{self.plugin_id}] {message}")
    
    def log_info(self, message: str):
        """Log info message"""
        print(f"[INFO][{self.plugin_id}] {message}")
    
    def log_warn(self, message: str):
        """Log warning message"""
        print(f"[WARN][{self.plugin_id}] {message}")
    
    def log_error(self, message: str):
        """Log error message"""
        print(f"[ERROR][{self.plugin_id}] {message}")


# Type aliases for hook functions
HookFunction = Callable[..., Any]
ToolFunction = Callable[..., Any]
CommandFunction = Callable[..., Any]


# =============================================================================
# Session API Types
# =============================================================================

class ChatMode(Enum):
    """Chat mode enumeration"""
    NORMAL = "normal"
    AGENT = "agent"
    CANVAS = "canvas"


@dataclass
class SessionFilter:
    """Filter options for listing sessions"""
    project_id: Optional[str] = None
    mode: Optional[ChatMode] = None
    has_messages: Optional[bool] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    limit: Optional[int] = None
    offset: Optional[int] = None
    sort_by: Optional[str] = None  # 'createdAt', 'updatedAt', 'title'
    sort_order: Optional[str] = None  # 'asc', 'desc'


@dataclass
class MessageQueryOptions:
    """Options for querying messages"""
    limit: Optional[int] = None
    offset: Optional[int] = None
    branch_id: Optional[str] = None
    include_deleted: bool = False
    after_id: Optional[str] = None
    before_id: Optional[str] = None


@dataclass
class MessageAttachment:
    """Message attachment for plugin use"""
    type: str  # 'file', 'image', 'code', 'url'
    name: str
    content: Optional[str] = None
    url: Optional[str] = None
    mime_type: Optional[str] = None
    size: Optional[int] = None


@dataclass
class SendMessageOptions:
    """Options for sending messages"""
    role: str = "user"  # 'user', 'assistant', 'system'
    attachments: List[MessageAttachment] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    skip_processing: bool = False


@dataclass
class SessionStats:
    """Session statistics"""
    message_count: int = 0
    user_message_count: int = 0
    assistant_message_count: int = 0
    total_tokens: int = 0
    average_response_time: float = 0.0
    branch_count: int = 0
    attachment_count: int = 0


@dataclass
class Session:
    """Chat session"""
    id: str
    title: str
    mode: ChatMode = ChatMode.NORMAL
    project_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class UIMessage:
    """UI Message"""
    id: str
    role: str
    content: str
    session_id: Optional[str] = None
    created_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


# =============================================================================
# Project API Types
# =============================================================================

@dataclass
class ProjectFilter:
    """Filter options for listing projects"""
    is_archived: Optional[bool] = None
    tags: Optional[List[str]] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    limit: Optional[int] = None
    offset: Optional[int] = None
    sort_by: Optional[str] = None  # 'createdAt', 'updatedAt', 'lastAccessedAt', 'name'
    sort_order: Optional[str] = None  # 'asc', 'desc'


@dataclass
class KnowledgeFile:
    """Knowledge file in project"""
    id: str
    name: str
    content: str
    type: str = "text"  # 'text', 'code', 'markdown', 'pdf'
    mime_type: Optional[str] = None
    size: Optional[int] = None
    created_at: Optional[datetime] = None


@dataclass
class ProjectFileInput:
    """Project file input for adding to knowledge base"""
    name: str
    content: str
    type: Optional[str] = None
    mime_type: Optional[str] = None


@dataclass
class Project:
    """Project definition"""
    id: str
    name: str
    description: str = ""
    is_archived: bool = False
    tags: List[str] = field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_accessed_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


# =============================================================================
# Vector/RAG API Types
# =============================================================================

@dataclass
class VectorDocument:
    """Vector document for storage"""
    content: str
    id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    embedding: Optional[List[float]] = None


@dataclass
class VectorFilter:
    """Vector filter for search"""
    key: str
    value: Union[str, int, float, bool]
    operation: str = "eq"  # 'eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains', 'in'


@dataclass
class VectorSearchOptions:
    """Vector search options"""
    top_k: int = 10
    threshold: Optional[float] = None
    filters: List[VectorFilter] = field(default_factory=list)
    filter_mode: str = "and"  # 'and', 'or'
    include_metadata: bool = True
    include_embeddings: bool = False


@dataclass
class VectorSearchResult:
    """Vector search result"""
    id: str
    content: str
    score: float
    metadata: Dict[str, Any] = field(default_factory=dict)
    embedding: Optional[List[float]] = None


@dataclass
class CollectionOptions:
    """Collection options for vector store"""
    embedding_model: Optional[str] = None
    dimensions: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CollectionStats:
    """Collection statistics"""
    name: str
    document_count: int
    dimensions: int
    created_at: Optional[datetime] = None
    last_updated: Optional[datetime] = None
    size_bytes: Optional[int] = None


# =============================================================================
# Theme API Types
# =============================================================================

class ThemeMode(Enum):
    """Theme mode"""
    LIGHT = "light"
    DARK = "dark"
    SYSTEM = "system"


class ColorThemePreset(Enum):
    """Color theme preset"""
    DEFAULT = "default"
    OCEAN = "ocean"
    FOREST = "forest"
    SUNSET = "sunset"
    LAVENDER = "lavender"
    ROSE = "rose"
    SLATE = "slate"
    AMBER = "amber"


@dataclass
class ThemeColors:
    """Theme colors structure"""
    primary: str = ""
    primary_foreground: str = ""
    secondary: str = ""
    secondary_foreground: str = ""
    accent: str = ""
    accent_foreground: str = ""
    background: str = ""
    foreground: str = ""
    muted: str = ""
    muted_foreground: str = ""
    card: str = ""
    card_foreground: str = ""
    border: str = ""
    ring: str = ""
    destructive: str = ""
    destructive_foreground: str = ""


@dataclass
class CustomTheme:
    """Custom theme definition"""
    id: str
    name: str
    colors: ThemeColors
    is_dark: bool = False


@dataclass
class ThemeState:
    """Current theme state"""
    mode: ThemeMode
    resolved_mode: str  # 'light' or 'dark'
    color_preset: ColorThemePreset
    custom_theme_id: Optional[str] = None
    colors: ThemeColors = field(default_factory=ThemeColors)


# =============================================================================
# Export API Types
# =============================================================================

class ExportFormat(Enum):
    """Export format types"""
    MARKDOWN = "markdown"
    JSON = "json"
    HTML = "html"
    ANIMATED_HTML = "animated-html"
    PDF = "pdf"
    TEXT = "text"
    DOCX = "docx"
    CSV = "csv"


@dataclass
class ExportOptions:
    """Export options"""
    format: ExportFormat
    theme: str = "system"  # 'light', 'dark', 'system'
    show_timestamps: bool = False
    show_tokens: bool = False
    show_thinking_process: bool = False
    show_tool_calls: bool = True
    include_metadata: bool = False
    include_attachments: bool = True
    include_cover_page: bool = False
    include_table_of_contents: bool = False


@dataclass
class ExportResult:
    """Export result"""
    success: bool
    blob: Optional[bytes] = None
    filename: Optional[str] = None
    error: Optional[str] = None


# =============================================================================
# Canvas API Types
# =============================================================================

@dataclass
class CanvasSelection:
    """Canvas selection"""
    start: int
    end: int
    text: str


@dataclass
class CanvasDocumentVersion:
    """Canvas document version"""
    id: str
    content: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None


@dataclass
class CanvasDocument:
    """Canvas document for editing"""
    id: str
    session_id: str
    title: str
    content: str
    language: str
    type: str = "code"  # 'code', 'text'
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    suggestions: List[Any] = field(default_factory=list)
    versions: List[CanvasDocumentVersion] = field(default_factory=list)


@dataclass
class CreateCanvasDocumentOptions:
    """Canvas document creation options"""
    title: str
    content: str
    language: str
    type: str = "code"  # 'code', 'text'
    session_id: Optional[str] = None


# =============================================================================
# Artifact API Types
# =============================================================================

@dataclass
class Artifact:
    """Artifact definition"""
    id: str
    title: str
    content: str
    language: str
    type: str = "code"  # 'code', 'text', 'react', 'html', 'svg', 'mermaid'
    session_id: Optional[str] = None
    message_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class CreateArtifactOptions:
    """Artifact creation options"""
    title: str
    content: str
    language: str
    session_id: Optional[str] = None
    message_id: Optional[str] = None
    type: str = "code"


@dataclass
class ArtifactFilter:
    """Artifact filter options"""
    session_id: Optional[str] = None
    language: Optional[str] = None
    type: Optional[str] = None
    limit: Optional[int] = None
    offset: Optional[int] = None


# =============================================================================
# Notification API Types
# =============================================================================

@dataclass
class NotificationAction:
    """Notification action"""
    label: str
    action: str
    variant: str = "default"  # 'default', 'primary', 'destructive'


@dataclass
class NotificationOptions:
    """Notification options"""
    title: str
    message: str
    type: str = "info"  # 'info', 'success', 'warning', 'error'
    duration: Optional[int] = None
    icon: Optional[str] = None
    actions: List[NotificationAction] = field(default_factory=list)
    persistent: bool = False
    progress: Optional[float] = None


@dataclass
class Notification:
    """Notification instance"""
    id: str
    title: str
    message: str
    type: str
    created_at: datetime
    actions: List[NotificationAction] = field(default_factory=list)
    progress: Optional[float] = None
    persistent: bool = False


# =============================================================================
# AI Provider API Types
# =============================================================================

@dataclass
class AIChatMessage:
    """Chat message for AI"""
    role: str  # 'user', 'assistant', 'system'
    content: str
    name: Optional[str] = None


@dataclass
class AIChatOptions:
    """Chat options"""
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    stop: Optional[List[str]] = None
    stream: bool = False


@dataclass
class AIChatChunk:
    """Chat response chunk"""
    content: str
    finish_reason: Optional[str] = None  # 'stop', 'length', 'tool_calls'
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None


@dataclass
class AIModel:
    """AI model definition"""
    id: str
    name: str
    provider: str
    context_length: int
    capabilities: List[str] = field(default_factory=list)


# =============================================================================
# Extension Points API Types
# =============================================================================

class ExtensionPoint(Enum):
    """UI extension points"""
    SIDEBAR_LEFT_TOP = "sidebar.left.top"
    SIDEBAR_LEFT_BOTTOM = "sidebar.left.bottom"
    SIDEBAR_RIGHT_TOP = "sidebar.right.top"
    SIDEBAR_RIGHT_BOTTOM = "sidebar.right.bottom"
    TOOLBAR_LEFT = "toolbar.left"
    TOOLBAR_CENTER = "toolbar.center"
    TOOLBAR_RIGHT = "toolbar.right"
    STATUSBAR_LEFT = "statusbar.left"
    STATUSBAR_CENTER = "statusbar.center"
    STATUSBAR_RIGHT = "statusbar.right"
    CHAT_INPUT_ABOVE = "chat.input.above"
    CHAT_INPUT_BELOW = "chat.input.below"
    CHAT_INPUT_ACTIONS = "chat.input.actions"
    CHAT_MESSAGE_ACTIONS = "chat.message.actions"
    CHAT_MESSAGE_FOOTER = "chat.message.footer"
    ARTIFACT_TOOLBAR = "artifact.toolbar"
    ARTIFACT_ACTIONS = "artifact.actions"
    CANVAS_TOOLBAR = "canvas.toolbar"
    CANVAS_SIDEBAR = "canvas.sidebar"
    SETTINGS_GENERAL = "settings.general"
    SETTINGS_APPEARANCE = "settings.appearance"
    SETTINGS_AI = "settings.ai"
    SETTINGS_PLUGINS = "settings.plugins"
    COMMAND_PALETTE = "command-palette"


@dataclass
class ExtensionOptions:
    """Extension options"""
    priority: int = 0
    condition: Optional[Callable[[], bool]] = None


# =============================================================================
# Permission API Types
# =============================================================================

class ExtendedPermission(Enum):
    """Extended plugin permissions"""
    SESSION_READ = "session:read"
    SESSION_WRITE = "session:write"
    SESSION_DELETE = "session:delete"
    PROJECT_READ = "project:read"
    PROJECT_WRITE = "project:write"
    PROJECT_DELETE = "project:delete"
    VECTOR_READ = "vector:read"
    VECTOR_WRITE = "vector:write"
    CANVAS_READ = "canvas:read"
    CANVAS_WRITE = "canvas:write"
    ARTIFACT_READ = "artifact:read"
    ARTIFACT_WRITE = "artifact:write"
    AI_CHAT = "ai:chat"
    AI_EMBED = "ai:embed"
    EXPORT_SESSION = "export:session"
    EXPORT_PROJECT = "export:project"
    THEME_READ = "theme:read"
    THEME_WRITE = "theme:write"
    EXTENSION_UI = "extension:ui"
    NOTIFICATION_SHOW = "notification:show"


# =============================================================================
# Network API Types
# =============================================================================

@dataclass
class NetworkRequestOptions:
    """Network request options"""
    method: str = "GET"
    headers: Dict[str, str] = field(default_factory=dict)
    body: Optional[Any] = None
    timeout: Optional[int] = None
    response_type: str = "json"


@dataclass
class NetworkResponse:
    """Network response"""
    ok: bool
    status: int
    status_text: str
    headers: Dict[str, str]
    data: Any


@dataclass
class DownloadProgress:
    """Download progress"""
    loaded: int
    total: int
    percent: float


@dataclass
class DownloadResult:
    """Download result"""
    path: str
    size: int
    content_type: Optional[str] = None


# =============================================================================
# File System API Types
# =============================================================================

@dataclass
class FileEntry:
    """File entry"""
    name: str
    path: str
    is_file: bool
    is_directory: bool
    size: Optional[int] = None


@dataclass
class FileStat:
    """File statistics"""
    size: int
    is_file: bool
    is_directory: bool
    is_symlink: bool = False
    created: Optional[datetime] = None
    modified: Optional[datetime] = None
    accessed: Optional[datetime] = None
    mode: Optional[int] = None


@dataclass
class FileWatchEvent:
    """File watch event"""
    type: str  # 'create', 'modify', 'delete', 'rename'
    path: str
    new_path: Optional[str] = None


# =============================================================================
# Shell API Types
# =============================================================================

@dataclass
class ShellOptions:
    """Shell command options"""
    cwd: Optional[str] = None
    env: Dict[str, str] = field(default_factory=dict)
    timeout: Optional[int] = None
    encoding: str = "utf-8"


@dataclass
class ShellResult:
    """Shell command result"""
    code: int
    stdout: str
    stderr: str
    success: bool


# =============================================================================
# Database API Types
# =============================================================================

@dataclass
class DatabaseResult:
    """Database operation result"""
    rows_affected: int
    last_insert_id: Optional[int] = None


@dataclass
class TableColumn:
    """Table column definition"""
    name: str
    type: str
    nullable: bool = True
    default: Optional[Any] = None
    unique: bool = False


@dataclass
class TableIndex:
    """Table index definition"""
    name: str
    columns: List[str]
    unique: bool = False


@dataclass
class TableSchema:
    """Table schema definition"""
    columns: List[TableColumn]
    primary_key: Optional[Union[str, List[str]]] = None
    indexes: List[TableIndex] = field(default_factory=list)


# =============================================================================
# Context Menu API Types
# =============================================================================

class ContextMenuContext(Enum):
    """Context menu context"""
    CHAT_MESSAGE = "chat:message"
    CHAT_INPUT = "chat:input"
    ARTIFACT = "artifact"
    SIDEBAR_PROJECT = "sidebar:project"
    SIDEBAR_SESSION = "sidebar:session"
    EDITOR = "editor"
    CANVAS = "canvas"


@dataclass
class ContextMenuClickContext:
    """Context menu click context"""
    target: ContextMenuContext
    selection: Optional[str] = None
    message_id: Optional[str] = None
    artifact_id: Optional[str] = None
    project_id: Optional[str] = None
    session_id: Optional[str] = None
    position: Optional[Dict[str, int]] = None


@dataclass
class ContextMenuItem:
    """Context menu item"""
    id: str
    label: str
    icon: Optional[str] = None
    when: Optional[Union[ContextMenuContext, List[ContextMenuContext]]] = None
    on_click: Optional[Callable[["ContextMenuClickContext"], None]] = None
    submenu: Optional[List["ContextMenuItem"]] = None
    separator: bool = False
    disabled: bool = False


# =============================================================================
# Shortcut API Types
# =============================================================================

@dataclass
class ShortcutOptions:
    """Shortcut options"""
    when: Optional[str] = None
    prevent_default: bool = True
    description: Optional[str] = None


@dataclass
class ShortcutRegistration:
    """Shortcut registration"""
    shortcut: str
    callback: Callable[[], None]
    options: Optional[ShortcutOptions] = None


# =============================================================================
# Window API Types
# =============================================================================

@dataclass
class WindowOptions:
    """Window options"""
    title: str
    width: int = 800
    height: int = 600
    min_width: Optional[int] = None
    min_height: Optional[int] = None
    max_width: Optional[int] = None
    max_height: Optional[int] = None
    x: Optional[int] = None
    y: Optional[int] = None
    center: bool = True
    resizable: bool = True
    fullscreen: bool = False
    always_on_top: bool = False
    decorations: bool = True
    transparent: bool = False
    url: Optional[str] = None
