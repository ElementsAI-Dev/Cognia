"""
Cognia Plugin SDK for Python

This SDK provides the necessary tools to create Python plugins for Cognia.

Features:
- Plugin base class with lifecycle management
- Decorators for tools, hooks, and commands
- Schema builders for type-safe parameter definitions
- A2UI component support
- Custom mode definitions
- Runtime context with IPC communication
- Full API access to Cognia features
"""

from .plugin import Plugin, create_plugin
from .decorators import tool, hook, command, HookType, VALID_HOOKS

# Schema helpers
from .schema import Schema, parameters, string, number, integer, boolean, array, object, optional, nullable

# A2UI components
from .a2ui import (
    A2UIComponentType,
    A2UIAction,
    A2UIDataBinding,
    A2UIStyle,
    A2UIComponentDef,
    A2UIVariable,
    A2UITemplateDef,
    A2UIDataChange,
    A2UIActionEvent,
    A2UIComponentRenderer,
    A2UIBuilder,
    a2ui_component,
    a2ui_template,
    component as a2ui_component_helper,
    register_component_renderer,
    get_component_renderer,
)

# Mode definitions
from .modes import (
    OutputFormat,
    ModeToolConfig,
    ModePromptTemplate,
    ModeDef,
    ModeContext,
    mode,
    ModeBuilder,
    ModeTemplates,
)

# IPC communication
from .ipc import (
    IPCMode,
    IPCMessage,
    IPCConfig,
    IPCError,
    TauriIPC,
    get_ipc,
)

# Runtime context
from .runtime import (
    RuntimeSessionAPI,
    RuntimeProjectAPI,
    RuntimeVectorAPI,
    RuntimeStorageAPI,
    RuntimeEventsAPI,
    RuntimeNetworkAPI,
    RuntimeFileSystemAPI,
    RuntimeShellAPI,
    RuntimePluginContext,
    create_runtime_context,
)

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
    # New types added for SDK parity
    UploadOptions,
    SpawnOptions,
    ChildProcess,
    DatabaseTransaction,
    CustomExporter,
    ArtifactRenderer,
    PluginStatus,
    PluginSource,
    PluginActivationEvent,
    HookPriority,
    HookRegistrationOptions,
    HookSandboxExecutionResult,
    ClipboardContent,
    # Debug types
    DebugLogLevel,
    DebugLogEntry,
    TraceEntry,
    PerformanceMetrics,
    Breakpoint,
    DebugSession,
    SlowOperation,
    # Profiler types
    MemoryUsage,
    PerformanceSample,
    PerformanceBucket,
    PerformanceReport,
    SlowOperationEntry,
    ProfilerConfig,
    # Version types
    SemanticVersion,
    UpdateInfo,
    VersionHistoryEntry,
    RollbackOptions,
    UpdateOptions,
    # Dependencies types
    DependencySpec,
    ResolvedDependency,
    DependencyNode,
    DependencyConflict,
    DependencyCheckResult,
    # Message Bus types
    MessagePriority,
    SubscriptionOptions,
    MessageMetadata,
    MessageEnvelope,
    TopicStats,
)

# New API modules
from .debug import DebugAPI
from .profiler import ProfilerAPI
from .version import VersionAPI
from .dependencies import DependenciesAPI
from .message_bus import MessageBusAPI
from .clipboard import ClipboardAPI

# Testing utilities
from .testing import (
    MockLogger,
    MockStorage,
    MockEventEmitter,
    MockSettings,
    MockContextOptions,
    MockPluginContext,
    Spy,
    create_mock_logger,
    create_mock_storage,
    create_mock_event_emitter,
    create_mock_settings,
    create_mock_context,
    create_mock_tool_context,
    create_spy,
    test_tool,
    test_hook,
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
    "HookType",
    "VALID_HOOKS",
    
    # Schema helpers
    "Schema",
    "parameters",
    "string",
    "number",
    "integer",
    "boolean",
    "array",
    "object",
    "optional",
    "nullable",
    
    # A2UI components
    "A2UIComponentType",
    "A2UIAction",
    "A2UIDataBinding",
    "A2UIStyle",
    "A2UIComponentDef",
    "A2UIVariable",
    "A2UITemplateDef",
    "A2UIDataChange",
    "A2UIActionEvent",
    "A2UIComponentRenderer",
    "A2UIBuilder",
    "a2ui_component",
    "a2ui_template",
    "a2ui_component_helper",
    "register_component_renderer",
    "get_component_renderer",
    
    # Mode definitions
    "OutputFormat",
    "ModeToolConfig",
    "ModePromptTemplate",
    "ModeDef",
    "ModeContext",
    "mode",
    "ModeBuilder",
    "ModeTemplates",
    
    # IPC
    "IPCMode",
    "IPCMessage",
    "IPCConfig",
    "IPCError",
    "TauriIPC",
    "get_ipc",
    
    # Runtime
    "RuntimeSessionAPI",
    "RuntimeProjectAPI",
    "RuntimeVectorAPI",
    "RuntimeStorageAPI",
    "RuntimeEventsAPI",
    "RuntimeNetworkAPI",
    "RuntimeFileSystemAPI",
    "RuntimeShellAPI",
    "RuntimePluginContext",
    "create_runtime_context",
    
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
    
    # New types for SDK parity
    "UploadOptions",
    "SpawnOptions",
    "ChildProcess",
    "DatabaseTransaction",
    "CustomExporter",
    "ArtifactRenderer",
    "PluginStatus",
    "PluginSource",
    "PluginActivationEvent",
    "HookPriority",
    "HookRegistrationOptions",
    "HookSandboxExecutionResult",
    "ClipboardContent",
    
    # Debug types
    "DebugLogLevel",
    "DebugLogEntry",
    "TraceEntry",
    "PerformanceMetrics",
    "Breakpoint",
    "DebugSession",
    "SlowOperation",
    
    # Profiler types
    "MemoryUsage",
    "PerformanceSample",
    "PerformanceBucket",
    "PerformanceReport",
    "SlowOperationEntry",
    "ProfilerConfig",
    
    # Version types
    "SemanticVersion",
    "UpdateInfo",
    "VersionHistoryEntry",
    "RollbackOptions",
    "UpdateOptions",
    
    # Dependencies types
    "DependencySpec",
    "ResolvedDependency",
    "DependencyNode",
    "DependencyConflict",
    "DependencyCheckResult",
    
    # Message Bus types
    "MessagePriority",
    "SubscriptionOptions",
    "MessageMetadata",
    "MessageEnvelope",
    "TopicStats",
    
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
    
    # New API classes
    "DebugAPI",
    "ProfilerAPI",
    "VersionAPI",
    "DependenciesAPI",
    "MessageBusAPI",
    "ClipboardAPI",
    
    # Testing utilities
    "MockLogger",
    "MockStorage",
    "MockEventEmitter",
    "MockSettings",
    "MockContextOptions",
    "MockPluginContext",
    "Spy",
    "create_mock_logger",
    "create_mock_storage",
    "create_mock_event_emitter",
    "create_mock_settings",
    "create_mock_context",
    "create_mock_tool_context",
    "create_spy",
    "test_tool",
    "test_hook",
    
    # Helpers
    "ProgressNotification",
    "DialogOptions",
    "InputDialogOptions",
    "ConfirmDialogOptions",
    "StatusBarItem",
]
