"""
Cognia Plugin SDK for Python

This SDK provides the necessary tools to create Python plugins for Cognia.
"""

from .plugin import Plugin, create_plugin
from .decorators import tool, hook, command

# Core types
from .types import (
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
    # Session
    Session, UIMessage, SessionFilter, MessageQueryOptions, SendMessageOptions, SessionStats, ChatMode,
    MessageAttachment,
    # Project
    Project, ProjectFilter, ProjectFileInput, KnowledgeFile,
    # Vector/RAG
    VectorDocument, VectorSearchOptions, VectorSearchResult, VectorFilter, CollectionOptions, CollectionStats,
    # Theme
    ThemeState, ThemeMode, ColorThemePreset, ThemeColors, CustomTheme,
    # Export
    ExportFormat, ExportOptions, ExportResult,
    # Canvas
    CanvasDocument, CreateCanvasDocumentOptions, CanvasSelection, CanvasDocumentVersion,
    # Artifact
    Artifact, CreateArtifactOptions, ArtifactFilter,
    # Notifications
    NotificationOptions, Notification, NotificationAction,
    # AI
    AIChatMessage, AIChatOptions, AIChatChunk, AIModel,
    # Extensions
    ExtensionPoint, ExtensionOptions,
    # Permissions
    ExtendedPermission,
    # Network
    NetworkRequestOptions, NetworkResponse, DownloadProgress, DownloadResult,
    # File System
    FileEntry, FileStat, FileWatchEvent,
    # Shell
    ShellOptions, ShellResult,
    # Database
    DatabaseResult, TableSchema, TableColumn, TableIndex,
    # Context Menu
    ContextMenuItem, ContextMenuClickContext, ContextMenuContext,
    # Shortcuts
    ShortcutOptions, ShortcutRegistration,
    # Window
    WindowOptions,
)

# Context APIs
from .context import (
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

__version__ = "1.0.0"
__all__ = [
    # Plugin base
    "Plugin",
    "create_plugin",
    
    # Decorators
    "tool",
    "hook",
    "command",
    
    # Core types
    "PluginType",
    "PluginCapability",
    "PluginPermission",
    "PluginManifest",
    "PluginContext",
    "ToolContext",
    "ToolParameter",
    "ToolMetadata",
    "HookMetadata",
    "CommandMetadata",
    
    # Session types
    "Session",
    "UIMessage",
    "SessionFilter",
    "MessageQueryOptions",
    "SendMessageOptions",
    "SessionStats",
    "ChatMode",
    "MessageAttachment",
    
    # Project types
    "Project",
    "ProjectFilter",
    "ProjectFileInput",
    "KnowledgeFile",
    
    # Vector types
    "VectorDocument",
    "VectorSearchOptions",
    "VectorSearchResult",
    "VectorFilter",
    "CollectionOptions",
    "CollectionStats",
    
    # Theme types
    "ThemeState",
    "ThemeMode",
    "ColorThemePreset",
    "ThemeColors",
    "CustomTheme",
    
    # Export types
    "ExportFormat",
    "ExportOptions",
    "ExportResult",
    
    # Canvas types
    "CanvasDocument",
    "CreateCanvasDocumentOptions",
    "CanvasSelection",
    "CanvasDocumentVersion",
    
    # Artifact types
    "Artifact",
    "CreateArtifactOptions",
    "ArtifactFilter",
    
    # Notification types
    "NotificationOptions",
    "Notification",
    "NotificationAction",
    
    # AI types
    "AIChatMessage",
    "AIChatOptions",
    "AIChatChunk",
    "AIModel",
    
    # Extension types
    "ExtensionPoint",
    "ExtensionOptions",
    
    # Permission types
    "ExtendedPermission",
    
    # Network types
    "NetworkRequestOptions",
    "NetworkResponse",
    "DownloadProgress",
    "DownloadResult",
    
    # File types
    "FileEntry",
    "FileStat",
    "FileWatchEvent",
    
    # Shell types
    "ShellOptions",
    "ShellResult",
    
    # Database types
    "DatabaseResult",
    "TableSchema",
    "TableColumn",
    "TableIndex",
    
    # Context Menu types
    "ContextMenuItem",
    "ContextMenuClickContext",
    "ContextMenuContext",
    
    # Shortcut types
    "ShortcutOptions",
    "ShortcutRegistration",
    
    # Window types
    "WindowOptions",
    
    # Context
    "ExtendedPluginContext",
    
    # API classes
    "SessionAPI",
    "ProjectAPI",
    "VectorAPI",
    "ThemeAPI",
    "ExportAPI",
    "CanvasAPI",
    "ArtifactAPI",
    "NotificationCenterAPI",
    "AIProviderAPI",
    "PermissionAPI",
    "NetworkAPI",
    "FileSystemAPI",
    "ShellAPI",
    "DatabaseAPI",
    "ShortcutsAPI",
    "ContextMenuAPI",
    "StorageAPI",
    "EventsAPI",
    "UIAPI",
    "SecretsAPI",
    "I18nAPI",
    
    # Helpers
    "ProgressNotification",
    "DialogOptions",
    "InputDialogOptions",
    "ConfirmDialogOptions",
    "StatusBarItem",
]
