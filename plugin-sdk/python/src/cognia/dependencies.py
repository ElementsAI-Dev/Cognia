"""
Dependency Management API for Cognia Plugin SDK

Provides dependency management for plugins including dependency resolution,
inter-plugin communication, and dependency graph management.
"""

from abc import ABC, abstractmethod
from typing import Callable, Generic, List, Optional, TypeVar

from .types import (
    DependencySpec,
    ResolvedDependency,
    DependencyNode,
    DependencyCheckResult,
)

T = TypeVar('T')


class DependenciesAPI(ABC):
    """
    Dependency Management API for plugins.
    
    Provides dependency management for plugins:
    - Declare and resolve dependencies
    - Check dependency satisfaction
    - Access dependent plugin APIs
    - Build dependency graphs
    
    Example:
        # Check dependencies
        check = await context.dependencies.check()
        if not check.satisfied:
            print('Missing:', check.missing)
            print('Conflicts:', check.conflicts)
        
        # Access a dependency's API
        other_plugin = context.dependencies.get_api('other-plugin')
        if other_plugin:
            result = await other_plugin.do_something()
        
        # Get dependency graph
        graph = context.dependencies.get_graph()
    """
    
    @abstractmethod
    async def check(self) -> DependencyCheckResult:
        """Check if all dependencies are satisfied"""
        pass
    
    @abstractmethod
    def get_declared(self) -> List[DependencySpec]:
        """Get declared dependencies"""
        pass
    
    @abstractmethod
    def get_resolved(self) -> List[ResolvedDependency]:
        """Get resolved dependencies"""
        pass
    
    @abstractmethod
    def has(self, plugin_id: str) -> bool:
        """Check if a specific dependency is available"""
        pass
    
    @abstractmethod
    def has_version(self, plugin_id: str, version: str) -> bool:
        """Check if a specific version is available"""
        pass
    
    @abstractmethod
    def get_api(self, plugin_id: str) -> Optional[T]:
        """Get a dependency's exported API"""
        pass
    
    @abstractmethod
    async def wait_for(self, plugin_id: str, timeout: Optional[int] = None) -> bool:
        """
        Wait for a dependency to be loaded.
        
        Args:
            plugin_id: Plugin ID to wait for
            timeout: Timeout in milliseconds
            
        Returns:
            Whether the dependency was loaded
        """
        pass
    
    @abstractmethod
    def get_graph(self) -> List[DependencyNode]:
        """Get dependency graph"""
        pass
    
    @abstractmethod
    def get_load_order(self) -> List[str]:
        """Get load order"""
        pass
    
    @abstractmethod
    def get_dependents(self) -> List[str]:
        """Get plugins that depend on this plugin"""
        pass
    
    @abstractmethod
    def expose_api(self, api: T) -> None:
        """
        Register API to expose to dependents.
        
        Args:
            api: API object to expose
        """
        pass
    
    @abstractmethod
    def on_dependency_loaded(self, plugin_id: str, handler: Callable[[], None]) -> Callable[[], None]:
        """
        Listen for dependency loaded event.
        
        Args:
            plugin_id: Plugin ID to watch
            handler: Handler called when dependency is loaded
            
        Returns:
            Unsubscribe function
        """
        pass
    
    @abstractmethod
    def on_dependency_unloaded(self, plugin_id: str, handler: Callable[[], None]) -> Callable[[], None]:
        """
        Listen for dependency unloaded event.
        
        Args:
            plugin_id: Plugin ID to watch
            handler: Handler called when dependency is unloaded
            
        Returns:
            Unsubscribe function
        """
        pass
    
    @abstractmethod
    async def request_install(self, dependencies: List[DependencySpec]) -> bool:
        """
        Request installation of missing dependencies.
        
        Args:
            dependencies: Dependencies to install
            
        Returns:
            Whether installation was successful
        """
        pass


__all__ = [
    "DependenciesAPI",
]
