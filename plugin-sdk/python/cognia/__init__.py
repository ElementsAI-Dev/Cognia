"""
Cognia Plugin SDK for Python

This SDK provides the necessary tools to create Python plugins for Cognia.
"""

from .plugin import Plugin, PluginMeta
from .decorators import tool, hook, command
from .types import (
    ToolMetadata,
    HookMetadata,
    PluginManifest,
    PluginContext,
    ToolContext,
)

__version__ = "1.0.0"
__all__ = [
    "Plugin",
    "PluginMeta",
    "tool",
    "hook",
    "command",
    "ToolMetadata",
    "HookMetadata",
    "PluginManifest",
    "PluginContext",
    "ToolContext",
]
