"""
Version Management API for Cognia Plugin SDK

Provides plugin version management, update checking, and rollback support.
"""

from abc import ABC, abstractmethod
from typing import Callable, List, Optional

from .types import (
    SemanticVersion,
    UpdateInfo,
    VersionHistoryEntry,
    RollbackOptions,
    UpdateOptions,
)


class VersionAPI(ABC):
    """
    Version Management API for plugins.
    
    Provides version management, update checking, and rollback capabilities.
    
    Example:
        # Get current version
        version = context.version.get_version()
        print(f'Current version: {version}')
        
        # Check for updates
        update_info = await context.version.check_for_updates()
        if update_info and update_info.update_available:
            print(f'New version available: {update_info.latest_version}')
            
        # Rollback to previous version
        await context.version.rollback(RollbackOptions(
            target_version='1.0.0',
            keep_config=True
        ))
    """
    
    @abstractmethod
    def get_version(self) -> str:
        """Get current plugin version"""
        pass
    
    @abstractmethod
    def get_semantic_version(self) -> SemanticVersion:
        """Get parsed semantic version"""
        pass
    
    @abstractmethod
    async def check_for_updates(self) -> Optional[UpdateInfo]:
        """Check for available updates"""
        pass
    
    @abstractmethod
    async def update(self, options: Optional[UpdateOptions] = None) -> None:
        """Download and apply update"""
        pass
    
    @abstractmethod
    async def rollback(self, options: RollbackOptions) -> None:
        """Rollback to a previous version"""
        pass
    
    @abstractmethod
    def get_history(self) -> List[VersionHistoryEntry]:
        """Get version history"""
        pass
    
    @abstractmethod
    def satisfies(self, version: str, constraint: str) -> bool:
        """
        Check if a version satisfies a constraint.
        
        Args:
            version: Version string
            constraint: Version constraint (e.g., '^1.0.0', '>=1.0.0')
        """
        pass
    
    @abstractmethod
    def compare(self, v1: str, v2: str) -> int:
        """
        Compare two versions.
        
        Returns:
            -1 if v1 < v2, 0 if equal, 1 if v1 > v2
        """
        pass
    
    @abstractmethod
    def parse(self, version: str) -> Optional[SemanticVersion]:
        """Parse a version string"""
        pass
    
    @abstractmethod
    def format(self, version: SemanticVersion) -> str:
        """Format a semantic version to string"""
        pass
    
    @abstractmethod
    def is_valid(self, version: str) -> bool:
        """Validate a version string"""
        pass
    
    @abstractmethod
    async def get_available_versions(self) -> List[str]:
        """Get available versions"""
        pass
    
    @abstractmethod
    def on_update_available(self, handler: Callable[[UpdateInfo], None]) -> Callable[[], None]:
        """
        Listen for update events.
        
        Args:
            handler: Handler called when update is available
            
        Returns:
            Unsubscribe function
        """
        pass


__all__ = [
    "VersionAPI",
]
