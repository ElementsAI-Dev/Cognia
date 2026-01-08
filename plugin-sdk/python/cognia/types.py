"""
Type definitions for Cognia Plugin SDK
"""

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Union
from enum import Enum


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
