"""
Base Plugin class for Cognia plugins
"""

import json
import os
from abc import ABC
from typing import Any, Callable, Dict, List, Optional, Type

from .types import (
    PluginManifest,
    PluginContext,
    PluginType,
    PluginCapability,
    ToolMetadata,
    HookMetadata,
)


class PluginMeta(type):
    """
    Metaclass for Plugin that automatically collects tools and hooks
    """
    def __new__(mcs, name: str, bases: tuple, namespace: dict) -> type:
        cls = super().__new__(mcs, name, bases, namespace)
        
        # Collect tools and hooks from methods
        tools = []
        hooks = []
        commands = []
        
        for attr_name in dir(cls):
            if attr_name.startswith('_'):
                continue
            
            attr = getattr(cls, attr_name, None)
            if attr is None:
                continue
            
            if hasattr(attr, '_tool_metadata'):
                tools.append(attr._tool_metadata)
            if hasattr(attr, '_hook_metadata'):
                hooks.append(attr._hook_metadata)
            if hasattr(attr, '_command_metadata'):
                commands.append(attr._command_metadata)
        
        cls._registered_tools = tools
        cls._registered_hooks = hooks
        cls._registered_commands = commands
        
        return cls


class Plugin(ABC, metaclass=PluginMeta):
    """
    Base class for Cognia plugins.
    
    Subclass this to create a Python plugin. Use the @tool, @hook, and @command
    decorators to define plugin functionality.
    
    Example:
        from cognia import Plugin, tool, hook
        
        class MyPlugin(Plugin):
            name = "my-plugin"
            version = "1.0.0"
            description = "My awesome plugin"
            
            @tool(description="Add two numbers")
            def add(self, a: int, b: int) -> int:
                return a + b
            
            @hook("on_agent_step")
            async def on_step(self, agent_id: str, step: dict):
                self.logger.info(f"Step: {step}")
    """
    
    # Plugin metadata - override in subclass
    name: str = ""
    version: str = "1.0.0"
    description: str = ""
    author: Optional[str] = None
    homepage: Optional[str] = None
    capabilities: List[PluginCapability] = []
    permissions: List[str] = []
    python_dependencies: List[str] = []
    
    # Internal state
    _registered_tools: List[Dict[str, Any]] = []
    _registered_hooks: List[Dict[str, Any]] = []
    _registered_commands: List[Dict[str, Any]] = []
    
    def __init__(self, context: Optional[PluginContext] = None):
        """Initialize the plugin with context"""
        self._context = context or PluginContext(
            plugin_id=self.name,
            plugin_path=os.path.dirname(os.path.abspath(__file__)),
        )
        self._config: Dict[str, Any] = {}
        self._enabled = False
    
    @property
    def context(self) -> PluginContext:
        """Get the plugin context"""
        return self._context
    
    @property
    def config(self) -> Dict[str, Any]:
        """Get the plugin configuration"""
        return self._config
    
    @property
    def logger(self) -> PluginContext:
        """Get the logger (same as context for convenience)"""
        return self._context
    
    @property
    def is_enabled(self) -> bool:
        """Check if plugin is enabled"""
        return self._enabled
    
    # Lifecycle methods - override as needed
    
    async def on_load(self) -> None:
        """Called when the plugin is loaded"""
        pass
    
    async def on_enable(self) -> None:
        """Called when the plugin is enabled"""
        self._enabled = True
    
    async def on_disable(self) -> None:
        """Called when the plugin is disabled"""
        self._enabled = False
    
    async def on_unload(self) -> None:
        """Called when the plugin is unloaded"""
        pass
    
    def on_config_change(self, config: Dict[str, Any]) -> None:
        """Called when the plugin configuration changes"""
        self._config = config
    
    # Utility methods
    
    def get_manifest(self) -> PluginManifest:
        """Generate plugin manifest from class attributes"""
        return PluginManifest(
            id=self.name,
            name=self.name,
            version=self.version,
            description=self.description,
            plugin_type=PluginType.PYTHON,
            capabilities=self.capabilities or [PluginCapability.TOOLS],
            python_dependencies=self.python_dependencies,
        )
    
    def get_tools(self) -> List[Dict[str, Any]]:
        """Get all registered tools"""
        return self._registered_tools
    
    def get_hooks(self) -> List[Dict[str, Any]]:
        """Get all registered hooks"""
        return self._registered_hooks
    
    def get_commands(self) -> List[Dict[str, Any]]:
        """Get all registered commands"""
        return self._registered_commands
    
    @classmethod
    def generate_manifest_file(cls, output_path: str = "plugin.json") -> str:
        """Generate a plugin.json manifest file"""
        instance = cls()
        manifest = instance.get_manifest()
        
        # Add tools to manifest
        manifest_dict = manifest.to_dict()
        
        if instance._registered_tools:
            manifest_dict["tools"] = [
                {
                    "name": t["name"],
                    "description": t["description"],
                    "parametersSchema": {
                        "type": "object",
                        "properties": {
                            name: {
                                "type": param.get("type", "string"),
                                "description": param.get("description", ""),
                            }
                            for name, param in t.get("parameters", {}).items()
                        },
                        "required": [
                            name
                            for name, param in t.get("parameters", {}).items()
                            if param.get("required", True)
                        ],
                    },
                    "requiresApproval": t.get("requires_approval", False),
                }
                for t in instance._registered_tools
            ]
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(manifest_dict, f, indent=2)
        
        return output_path


def create_plugin(
    name: str,
    version: str = "1.0.0",
    description: str = "",
    **kwargs
) -> Type[Plugin]:
    """
    Factory function to create a plugin class dynamically.
    
    Example:
        MyPlugin = create_plugin(
            name="my-plugin",
            version="1.0.0",
            description="My plugin"
        )
        
        @MyPlugin.tool(description="Add numbers")
        def add(self, a: int, b: int) -> int:
            return a + b
    """
    class DynamicPlugin(Plugin):
        pass
    
    DynamicPlugin.name = name
    DynamicPlugin.version = version
    DynamicPlugin.description = description
    
    for key, value in kwargs.items():
        setattr(DynamicPlugin, key, value)
    
    return DynamicPlugin
