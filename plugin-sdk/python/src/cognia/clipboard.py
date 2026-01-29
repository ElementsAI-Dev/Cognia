"""
Clipboard API for Cognia Plugin SDK

Provides clipboard read/write operations for text and images.
"""

from abc import ABC, abstractmethod
from typing import Optional


class ClipboardAPI(ABC):
    """
    Clipboard API for plugins.
    
    Provides access to system clipboard for reading and writing
    text and image content.
    
    Example:
        # Read text from clipboard
        text = await context.clipboard.read_text()
        
        # Write text to clipboard
        await context.clipboard.write_text('Hello, World!')
        
        # Check clipboard content
        if await context.clipboard.has_text():
            content = await context.clipboard.read_text()
    """
    
    @abstractmethod
    async def read_text(self) -> Optional[str]:
        """
        Read text from clipboard.
        
        Returns:
            Clipboard text content or None
        """
        pass
    
    @abstractmethod
    async def write_text(self, text: str) -> None:
        """
        Write text to clipboard.
        
        Args:
            text: Text to write
        """
        pass
    
    @abstractmethod
    async def read_image(self) -> Optional[bytes]:
        """
        Read image from clipboard.
        
        Returns:
            Image data as bytes or None
        """
        pass
    
    @abstractmethod
    async def write_image(self, data: bytes) -> None:
        """
        Write image to clipboard.
        
        Args:
            data: Image data as bytes
        """
        pass
    
    @abstractmethod
    async def has_text(self) -> bool:
        """
        Check if clipboard has text content.
        
        Returns:
            Whether clipboard contains text
        """
        pass
    
    @abstractmethod
    async def has_image(self) -> bool:
        """
        Check if clipboard has image content.
        
        Returns:
            Whether clipboard contains an image
        """
        pass
    
    @abstractmethod
    async def clear(self) -> None:
        """Clear clipboard content"""
        pass


__all__ = [
    "ClipboardAPI",
]
